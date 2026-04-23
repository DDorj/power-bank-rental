import { ApiProperty } from '@nestjs/swagger';

const BONUM_PURPOSES = ['topup', 'direct_payment'] as const;
const BONUM_STATUSES = ['pending', 'paid', 'failed', 'expired'] as const;
const WALLET_TRANSACTION_TYPES = [
  'topup',
  'freeze',
  'unfreeze',
  'charge',
  'refund',
  'adjustment',
] as const;

export class AdminPaymentListItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ example: 'Batzaya User' })
  userName!: string;

  @ApiProperty({ example: '+97699000002', nullable: true })
  userPhone!: string | null;

  @ApiProperty({ example: 'topup-3a2d8a9e-7b34-4cc7-9648-6f652df27fd7' })
  transactionId!: string;

  @ApiProperty({ example: 'INV-123456789' })
  invoiceId!: string;

  @ApiProperty({ example: 5000 })
  amount!: number;

  @ApiProperty({ enum: BONUM_PURPOSES, example: 'topup' })
  purpose!: (typeof BONUM_PURPOSES)[number];

  @ApiProperty({ enum: BONUM_STATUSES, example: 'paid' })
  status!: (typeof BONUM_STATUSES)[number];

  @ApiProperty({
    example: 'https://ecommerce.bonum.mn/ecommerce?invoiceId=INV-123',
  })
  followUpLink!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  expiresAt!: Date;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  paidAt!: Date | null;

  @ApiProperty({ example: 'seed-payment-1', nullable: true })
  paymentTransactionId!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class AdminPaymentsResponseDto {
  @ApiProperty({ type: AdminPaymentListItemDto, isArray: true })
  data!: AdminPaymentListItemDto[];

  @ApiProperty({ example: 14 })
  total!: number;
}

export class AdminPaymentWebhookEventDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'topup-3a2d8a9e-7b34-4cc7-9648-6f652df27fd7' })
  transactionId!: string;

  @ApiProperty({ enum: ['payment', 'refund'], example: 'payment' })
  eventType!: 'payment' | 'refund';

  @ApiProperty({ type: String, format: 'date-time' })
  receivedAt!: Date;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  processedAt!: Date | null;
}

export class AdminPaymentDetailDto extends AdminPaymentListItemDto {
  @ApiProperty({ type: AdminPaymentWebhookEventDto, isArray: true })
  webhookEvents!: AdminPaymentWebhookEventDto[];
}

export class AdminWalletTransactionListItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  walletId!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ example: 'Saraa User' })
  userName!: string;

  @ApiProperty({ example: '+97699000003', nullable: true })
  userPhone!: string | null;

  @ApiProperty({ enum: WALLET_TRANSACTION_TYPES, example: 'charge' })
  type!: (typeof WALLET_TRANSACTION_TYPES)[number];

  @ApiProperty({ example: 3000 })
  amount!: number;

  @ApiProperty({ example: 12000 })
  balanceAfter!: number;

  @ApiProperty({ example: 0 })
  frozenAfter!: number;

  @ApiProperty({ format: 'uuid', nullable: true })
  referenceId!: string | null;

  @ApiProperty({ example: 'Түрээсийн төлбөр', nullable: true })
  description!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

export class AdminWalletTransactionsResponseDto {
  @ApiProperty({ type: AdminWalletTransactionListItemDto, isArray: true })
  data!: AdminWalletTransactionListItemDto[];

  @ApiProperty({ example: 42 })
  total!: number;
}
