export interface CreatePaymentInvoiceParams {
  transactionId: string;
  amount: number;
  callbackUrl: string;
  expiresInSeconds?: number;
}

export interface PaymentInvoice {
  invoiceId: string;
  followUpLink: string;
  expiresAt: Date;
}

export interface PaymentProvider {
  readonly name: string;
  createInvoice(params: CreatePaymentInvoiceParams): Promise<PaymentInvoice>;
  verifyWebhook(
    payload: unknown,
    signature: string,
    rawBody?: Buffer,
  ): boolean;
}
