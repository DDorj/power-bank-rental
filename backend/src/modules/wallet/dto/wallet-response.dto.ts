import { ApiProperty } from '@nestjs/swagger';

const WALLET_TRANSACTION_TYPES = [
  'topup',
  'freeze',
  'unfreeze',
  'charge',
  'refund',
  'adjustment',
] as const;

export class WalletSummaryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ example: 20000 })
  balance!: number;

  @ApiProperty({ example: 5000 })
  frozenAmount!: number;

  @ApiProperty({ example: 15000 })
  availableBalance!: number;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-04-22T10:30:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-04-22T10:30:00.000Z',
  })
  updatedAt!: Date;
}

export class WalletTransactionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  walletId!: string;

  @ApiProperty({ enum: WALLET_TRANSACTION_TYPES, example: 'topup' })
  type!: (typeof WALLET_TRANSACTION_TYPES)[number];

  @ApiProperty({ example: 5000 })
  amount!: number;

  @ApiProperty({ example: 20000 })
  balanceAfter!: number;

  @ApiProperty({ example: 5000 })
  frozenAfter!: number;

  @ApiProperty({ format: 'uuid', nullable: true })
  referenceId!: string | null;

  @ApiProperty({ example: 'Шууд цэнэглэлт (dev)', nullable: true })
  description!: string | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-04-22T10:30:00.000Z',
  })
  createdAt!: Date;
}

export class WalletTransactionsResponseDto {
  @ApiProperty({ type: WalletTransactionResponseDto, isArray: true })
  data!: WalletTransactionResponseDto[];

  @ApiProperty({ example: 42 })
  total!: number;
}
