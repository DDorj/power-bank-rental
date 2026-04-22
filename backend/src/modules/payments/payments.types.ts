import type {
  BonumInvoicePurpose,
  BonumInvoiceStatus,
  BonumWebhookEventType,
} from '../../../generated/prisma/enums.js';

export interface BonumInvoiceRecord {
  id: string;
  userId: string;
  transactionId: string;
  invoiceId: string;
  amount: number;
  purpose: BonumInvoicePurpose;
  status: BonumInvoiceStatus;
  followUpLink: string;
  expiresAt: Date;
  paidAt: Date | null;
  paymentTransactionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BonumWebhookEventRecord {
  id: string;
  transactionId: string;
  invoiceId: string;
  eventType: BonumWebhookEventType;
  payload: unknown;
  signature: string;
  receivedAt: Date;
  processedAt: Date | null;
}

export interface CreateBonumInvoiceParams {
  userId: string;
  transactionId: string;
  invoiceId: string;
  amount: number;
  purpose: BonumInvoicePurpose;
  status: BonumInvoiceStatus;
  followUpLink: string;
  expiresAt: Date;
}

export interface CreateBonumWebhookEventParams {
  transactionId: string;
  invoiceId: string;
  eventType: BonumWebhookEventType;
  payload: unknown;
  signature: string;
}

export interface RawBonumWebhookPayload {
  type: string;
  status: string;
  message?: string | null;
  body: Record<string, unknown>;
}

export interface NormalizedBonumWebhookPayload {
  type: 'PAYMENT';
  webhookStatus: 'SUCCESS' | 'FAILED';
  invoiceId: string | null;
  transactionId: string;
  amount: number | null;
  invoiceStatus: string | null;
  completedAt: Date | null;
}

export interface ProcessBonumWebhookResult {
  received: boolean;
  duplicate: boolean;
  processed: boolean;
  transactionId: string;
  invoiceStatus: BonumInvoiceStatus;
}
