import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import type { EnvConfig } from '../../../config/env.schema.js';
import { buildAppError } from '../../../common/errors/app-errors.js';
import type {
  CreatePaymentInvoiceParams,
  PaymentInvoice,
  PaymentProvider,
} from '../payment-provider.interface.js';

const DEFAULT_INVOICE_EXPIRES_IN_SECONDS = 600;
const TOKEN_EXPIRY_SKEW_MS = 5_000;

type BonumTokenResponse = {
  tokenType: string;
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  refreshExpiresIn: number;
  unit: string;
};

type BonumAllInOneInvoiceResponse = {
  invoiceId: string;
  followUpLink: string;
};

type BonumConfig = {
  baseUrl: string;
  appSecret: string;
  terminalId: string;
};

type CachedTokens = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function unwrapBonumResponseData(value: unknown): unknown {
  if (isRecord(value) && 'data' in value && value['data'] !== null) {
    return value['data'];
  }

  return value;
}

function isBonumTokenResponse(value: unknown): value is BonumTokenResponse {
  return (
    isRecord(value) &&
    isString(value['tokenType']) &&
    isString(value['accessToken']) &&
    isNumber(value['expiresIn']) &&
    isString(value['refreshToken']) &&
    isNumber(value['refreshExpiresIn']) &&
    isString(value['unit'])
  );
}

function isBonumAllInOneInvoiceResponse(
  value: unknown,
): value is BonumAllInOneInvoiceResponse {
  return (
    isRecord(value) &&
    isString(value['invoiceId']) &&
    isString(value['followUpLink'])
  );
}

@Injectable()
export class BonumProvider implements PaymentProvider {
  readonly name = 'bonum';
  private readonly logger = new Logger(BonumProvider.name);
  private tokens: CachedTokens | null = null;

  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  async createInvoice(
    params: CreatePaymentInvoiceParams,
  ): Promise<PaymentInvoice> {
    const bonumConfig = this.getBonumConfig();
    const expiresInSeconds =
      params.expiresInSeconds ??
      this.config.get('BONUM_INVOICE_EXPIRES_IN', { infer: true }) ??
      this.config.get('BONUM_QR_EXPIRES_IN', { infer: true }) ??
      DEFAULT_INVOICE_EXPIRES_IN_SECONDS;
    const payload = {
      amount: params.amount,
      callback: params.callbackUrl,
      transactionId: params.transactionId,
      expiresIn: expiresInSeconds,
    };

    const response = await this.fetchWithAccessToken(
      bonumConfig,
      '/bonum-gateway/ecommerce/invoices',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Language': 'mn',
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      const body = await this.safeReadBody(response);
      this.logger.error(
        `Bonum invoice create failed: ${response.status} ${body}`,
      );
      throw new ServiceUnavailableException(
        buildAppError('BONUM_INVOICE_CREATE_FAILED'),
      );
    }

    const raw: unknown = await response.json();
    const data = unwrapBonumResponseData(raw);
    if (!isBonumAllInOneInvoiceResponse(data)) {
      throw new ServiceUnavailableException(
        buildAppError('BONUM_INVOICE_CREATE_FAILED'),
      );
    }

    return {
      invoiceId: data.invoiceId,
      followUpLink: data.followUpLink,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
    };
  }

  verifyWebhook(payload: unknown, signature: string, rawBody?: Buffer): boolean {
    const checksumKey =
      this.config.get('BONUM_MERCHANT_CHECKSUM_KEY', { infer: true }) ??
      this.config.get('MERCHANT_CHECKSUM_KEY', { infer: true }) ??
      this.config.get('BONUM_MERCHANT_KEY', { infer: true }) ??
      null;
    if (!checksumKey || !signature) {
      return false;
    }

    const serialized = rawBody?.toString('utf8') ?? JSON.stringify(payload);
    const expected = this.sign(serialized, checksumKey);
    const actual = signature.trim().toLowerCase();

    if (expected.length !== actual.length) {
      return false;
    }

    return timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
  }

  private getBonumConfig(): BonumConfig {
    const baseUrl =
      this.config.get('BONUM_BASE_URL', { infer: true }) ??
      this.config.get('BONUM_API_URL', { infer: true });
    const appSecret = this.config.get('BONUM_APP_SECRET', { infer: true });
    const terminalId = this.config.get('BONUM_TERMINAL_ID', { infer: true });
    if (!baseUrl || !appSecret || !terminalId) {
      throw new BadRequestException(buildAppError('BONUM_NOT_CONFIGURED'));
    }

    return {
      baseUrl: baseUrl.replace(/\/$/, ''),
      appSecret,
      terminalId,
    };
  }

  private async fetchWithAccessToken(
    bonumConfig: BonumConfig,
    path: string,
    init: RequestInit,
  ): Promise<Response> {
    const accessToken = await this.getAccessToken(bonumConfig);
    let response = await fetch(`${bonumConfig.baseUrl}${path}`, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status !== 401) {
      return response;
    }

    const refreshedAccessToken = await this.getAccessToken(bonumConfig, true);
    response = await fetch(`${bonumConfig.baseUrl}${path}`, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${refreshedAccessToken}`,
      },
    });

    return response;
  }

  private async getAccessToken(
    bonumConfig: BonumConfig,
    forceRefresh = false,
  ): Promise<string> {
    const now = Date.now();
    if (
      !forceRefresh &&
      this.tokens &&
      this.tokens.accessTokenExpiresAt > now + TOKEN_EXPIRY_SKEW_MS
    ) {
      return this.tokens.accessToken;
    }

    if (
      this.tokens &&
      this.tokens.refreshTokenExpiresAt > now + TOKEN_EXPIRY_SKEW_MS
    ) {
      try {
        const refreshed = await this.refreshTokens(bonumConfig);
        this.tokens = refreshed;
        return refreshed.accessToken;
      } catch (error) {
        this.logger.warn(
          `Bonum token refresh failed, falling back to create token: ${String(error)}`,
        );
      }
    }

    const created = await this.createTokens(bonumConfig);
    this.tokens = created;
    return created.accessToken;
  }

  private async createTokens(bonumConfig: BonumConfig): Promise<CachedTokens> {
    const response = await fetch(
      `${bonumConfig.baseUrl}/bonum-gateway/ecommerce/auth/create`,
      {
        method: 'GET',
        headers: {
          Authorization: `AppSecret ${bonumConfig.appSecret}`,
          'X-TERMINAL-ID': bonumConfig.terminalId,
          'Accept-Language': 'mn',
        },
      },
    );

    return this.parseTokenResponse(response);
  }

  private async refreshTokens(bonumConfig: BonumConfig): Promise<CachedTokens> {
    if (!this.tokens) {
      throw new Error('Missing Bonum refresh token');
    }

    const response = await fetch(
      `${bonumConfig.baseUrl}/bonum-gateway/ecommerce/auth/refresh`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.tokens.refreshToken}`,
          'Accept-Language': 'mn',
        },
      },
    );

    return this.parseTokenResponse(response);
  }

  private async parseTokenResponse(response: Response): Promise<CachedTokens> {
    if (!response.ok) {
      const body = await this.safeReadBody(response);
      this.logger.error(`Bonum auth failed: ${response.status} ${body}`);
      throw new ServiceUnavailableException(buildAppError('BONUM_AUTH_FAILED'));
    }

    const raw: unknown = await response.json();
    const data = unwrapBonumResponseData(raw);
    if (!isBonumTokenResponse(data)) {
      throw new ServiceUnavailableException(buildAppError('BONUM_AUTH_FAILED'));
    }

    const now = Date.now();
    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      accessTokenExpiresAt: now + data.expiresIn * 1000,
      refreshTokenExpiresAt: now + data.refreshExpiresIn * 1000,
    };
  }

  private async safeReadBody(response: Response): Promise<string> {
    try {
      return await response.text();
    } catch {
      return '<unavailable>';
    }
  }

  private sign(body: string, checksumKey: string): string {
    return createHmac('sha256', checksumKey).update(body).digest('hex');
  }
}
