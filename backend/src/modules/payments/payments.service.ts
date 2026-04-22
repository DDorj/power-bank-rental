import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { RedisService } from '../../common/redis/redis.service.js';
import { buildAppError } from '../../common/errors/app-errors.js';
import type { EnvConfig } from '../../config/env.schema.js';
import { WalletService } from '../wallet/wallet.service.js';
import { BonumProvider } from './bonum/bonum.provider.js';
import { PaymentsRepository } from './payments.repository.js';
import type { BonumInvoiceStatus } from '../../../generated/prisma/enums.js';
import type {
  BonumInvoiceRecord,
  NormalizedBonumWebhookPayload,
  ProcessBonumWebhookResult,
  RawBonumWebhookPayload,
} from './payments.types.js';

const PAYMENT_LOCK_TTL_MS = 5_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function parseBonumDate(value: unknown): Date | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly repo: PaymentsRepository,
    private readonly bonum: BonumProvider,
    private readonly walletService: WalletService,
    private readonly redis: RedisService,
    private readonly config: ConfigService<EnvConfig, true>,
  ) {}

  async createWalletTopupInvoice(
    userId: string,
    amount: number,
  ): Promise<BonumInvoiceRecord> {
    const callbackUrl = this.config.get('BONUM_CALLBACK_URL', { infer: true });
    if (!callbackUrl) {
      throw new BadRequestException(buildAppError('BONUM_NOT_CONFIGURED'));
    }

    const transactionId = `topup-${randomUUID()}`;
    const created = await this.bonum.createInvoice({
      transactionId,
      amount,
      callbackUrl,
    });

    return this.repo.createBonumInvoice({
      userId,
      transactionId,
      invoiceId: created.invoiceId,
      amount,
      purpose: 'topup',
      status: 'pending',
      followUpLink: created.followUpLink,
      expiresAt: created.expiresAt,
    });
  }

  async processBonumWebhook(
    payload: RawBonumWebhookPayload,
    signature: string,
    rawBody?: Buffer,
  ): Promise<ProcessBonumWebhookResult> {
    if (!this.bonum.verifyWebhook(payload, signature, rawBody)) {
      throw new UnauthorizedException(buildAppError('BONUM_INVALID_SIGNATURE'));
    }

    const webhook = this.parseWebhookPayload(payload);
    const normalizedStatus = this.normalizeStatus(webhook);
    const invoice = await this.findInvoiceForWebhook(webhook);

    try {
      const event = await this.repo.createBonumWebhookEvent({
        transactionId: webhook.transactionId,
        invoiceId: invoice.id,
        eventType: 'payment',
        payload,
        signature,
      });

      if (normalizedStatus !== 'paid') {
        await this.repo.$transaction(async (tx) => {
          await this.repo.updateBonumInvoiceStatusInTx(
            tx,
            invoice.id,
            normalizedStatus,
          );
          await this.repo.markWebhookProcessedInTx(tx, event.id);
        });

        return {
          received: true,
          duplicate: false,
          processed: true,
          transactionId: invoice.transactionId,
          invoiceStatus: normalizedStatus,
        };
      }

      const release = await this.redis.acquireLock(
        `wallet:${invoice.userId}`,
        PAYMENT_LOCK_TTL_MS,
      );

      try {
        const status = await this.repo.$transaction(async (tx) => {
          const current = await this.repo.findBonumInvoiceByIdInTx(tx, invoice.id);
          if (!current) {
            throw new NotFoundException(buildAppError('BONUM_INVOICE_NOT_FOUND'));
          }

          if (current.status !== 'pending') {
            await this.repo.markWebhookProcessedInTx(tx, event.id);
            return current.status;
          }

          const updated = await this.repo.updateBonumInvoiceStatusInTx(
            tx,
            invoice.id,
            'paid',
            {
              paidAt: webhook.completedAt ?? new Date(),
              paymentTransactionId: webhook.transactionId,
            },
          );

          await this.walletService.applyInExistingTx(tx, {
            userId: invoice.userId,
            type: 'topup',
            amount: invoice.amount,
            referenceId: invoice.id,
            description: 'Bonum wallet цэнэглэлт',
          });

          await this.repo.markWebhookProcessedInTx(tx, event.id);
          return updated.status;
        });

        return {
          received: true,
          duplicate: false,
          processed: true,
          transactionId: invoice.transactionId,
          invoiceStatus: status,
        };
      } finally {
        await release();
      }
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        return {
          received: true,
          duplicate: true,
          processed: false,
          transactionId: invoice.transactionId,
          invoiceStatus: invoice.status,
        };
      }
      throw error;
    }
  }

  private async findInvoiceForWebhook(
    webhook: NormalizedBonumWebhookPayload,
  ): Promise<BonumInvoiceRecord> {
    if (webhook.invoiceId !== null) {
      const invoice = await this.repo.findBonumInvoiceByInvoiceId(webhook.invoiceId);
      if (invoice) {
        return invoice;
      }
    }

    const invoice = await this.repo.findBonumInvoiceByTransactionId(
      webhook.transactionId,
    );
    if (!invoice) {
      throw new NotFoundException(buildAppError('BONUM_INVOICE_NOT_FOUND'));
    }

    return invoice;
  }

  private parseWebhookPayload(
    payload: RawBonumWebhookPayload,
  ): NormalizedBonumWebhookPayload {
    const type = payload.type.trim().toUpperCase();
    const webhookStatus = payload.status.trim().toUpperCase();

    if (type !== 'PAYMENT') {
      throw new BadRequestException(buildAppError('BONUM_INVALID_PAYLOAD'));
    }

    if (webhookStatus !== 'SUCCESS' && webhookStatus !== 'FAILED') {
      throw new BadRequestException(buildAppError('BONUM_INVALID_PAYLOAD'));
    }

    if (!isRecord(payload.body)) {
      throw new BadRequestException(buildAppError('BONUM_INVALID_PAYLOAD'));
    }

    const transactionId = asString(payload.body['transactionId']);
    if (!transactionId) {
      throw new BadRequestException(buildAppError('BONUM_INVALID_PAYLOAD'));
    }

    const invoiceId = asString(payload.body['invoiceId']);
    if (webhookStatus === 'SUCCESS' && !invoiceId) {
      throw new BadRequestException(buildAppError('BONUM_INVALID_PAYLOAD'));
    }

    return {
      type: 'PAYMENT',
      webhookStatus,
      invoiceId,
      transactionId,
      amount: asNumber(payload.body['amount']),
      invoiceStatus:
        asString(payload.body['status']) ?? asString(payload.body['invoiceStatus']),
      completedAt:
        parseBonumDate(payload.body['completedAt']) ??
        parseBonumDate(payload.body['updatedAt']),
    };
  }

  private normalizeStatus(
    payload: NormalizedBonumWebhookPayload,
  ): BonumInvoiceStatus {
    if (payload.webhookStatus === 'SUCCESS') {
      return 'paid';
    }

    const invoiceStatus = payload.invoiceStatus?.trim().toUpperCase();
    if (invoiceStatus === 'EXPIRED') {
      return 'expired';
    }

    return 'failed';
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error['code'] === 'P2002'
    );
  }
}
