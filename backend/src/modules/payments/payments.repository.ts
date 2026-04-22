import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { Prisma } from '../../../generated/prisma/client.js';
import type { PrismaClient } from '../../../generated/prisma/client.js';
import type { BonumInvoiceStatus } from '../../../generated/prisma/enums.js';
import type {
  BonumInvoiceRecord,
  BonumWebhookEventRecord,
  CreateBonumInvoiceParams,
  CreateBonumWebhookEventParams,
} from './payments.types.js';

type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

type BonumInvoiceRow = {
  id: string;
  userId: string;
  transactionId: string;
  invoiceId: string;
  amount: number;
  purpose: BonumInvoiceRecord['purpose'];
  status: BonumInvoiceRecord['status'];
  followUpLink: string;
  expiresAt: Date;
  paidAt: Date | null;
  paymentTransactionId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function mapBonumInvoice(record: BonumInvoiceRow): BonumInvoiceRecord {
  return {
    id: record.id,
    userId: record.userId,
    transactionId: record.transactionId,
    invoiceId: record.invoiceId,
    amount: record.amount,
    purpose: record.purpose,
    status: record.status,
    followUpLink: record.followUpLink,
    expiresAt: record.expiresAt,
    paidAt: record.paidAt,
    paymentTransactionId: record.paymentTransactionId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createBonumInvoice(
    params: CreateBonumInvoiceParams,
  ): Promise<BonumInvoiceRecord> {
    const record = await this.prisma.bonumInvoice.create({
      data: {
        userId: params.userId,
        transactionId: params.transactionId,
        invoiceId: params.invoiceId,
        amount: params.amount,
        purpose: params.purpose,
        status: params.status,
        followUpLink: params.followUpLink,
        qrImage: null,
        paymentLinks: Prisma.JsonNull,
        expiresAt: params.expiresAt,
      },
    });

    return mapBonumInvoice(record);
  }

  async findBonumInvoiceByTransactionId(
    transactionId: string,
  ): Promise<BonumInvoiceRecord | null> {
    const record = await this.prisma.bonumInvoice.findUnique({
      where: { transactionId },
    });
    return record ? mapBonumInvoice(record) : null;
  }

  async findBonumInvoiceByInvoiceId(
    invoiceId: string,
  ): Promise<BonumInvoiceRecord | null> {
    const record = await this.prisma.bonumInvoice.findUnique({
      where: { invoiceId },
    });
    return record ? mapBonumInvoice(record) : null;
  }

  async findBonumInvoiceByTransactionIdForUser(
    transactionId: string,
    userId: string,
  ): Promise<BonumInvoiceRecord | null> {
    const record = await this.prisma.bonumInvoice.findFirst({
      where: { transactionId, userId },
    });
    return record ? mapBonumInvoice(record) : null;
  }

  createBonumWebhookEvent(
    params: CreateBonumWebhookEventParams,
  ): Promise<BonumWebhookEventRecord> {
    return this.prisma.bonumWebhookEvent.create({
      data: {
        transactionId: params.transactionId,
        invoiceId: params.invoiceId,
        eventType: params.eventType,
        payload: params.payload as Prisma.InputJsonValue,
        signature: params.signature,
      },
    });
  }

  async findBonumInvoiceByIdInTx(
    tx: Tx,
    id: string,
  ): Promise<BonumInvoiceRecord | null> {
    const record = await tx.bonumInvoice.findUnique({ where: { id } });
    return record ? mapBonumInvoice(record) : null;
  }

  async updateBonumInvoiceStatusInTx(
    tx: Tx,
    id: string,
    status: BonumInvoiceStatus,
    extra?: {
      paidAt?: Date;
      paymentTransactionId?: string;
    },
  ): Promise<BonumInvoiceRecord> {
    const record = await tx.bonumInvoice.update({
      where: { id },
      data: {
        status,
        paidAt: extra?.paidAt,
        paymentTransactionId: extra?.paymentTransactionId,
      },
    });

    return mapBonumInvoice(record);
  }

  markWebhookProcessedInTx(tx: Tx, id: string): Promise<BonumWebhookEventRecord> {
    return tx.bonumWebhookEvent.update({
      where: { id },
      data: { processedAt: new Date() },
    });
  }

  $transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}
