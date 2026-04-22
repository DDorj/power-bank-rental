import { ApiProperty } from '@nestjs/swagger';
import {
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class BonumWebhookBodyDto {
  @ApiProperty({ example: '8eff7d69001c03f486f64410f9daa82c', required: false })
  @IsOptional()
  @IsString()
  invoiceId?: string;

  @ApiProperty({ example: 'topup-3a2d8a9e-7b34-4cc7-9648-6f652df27fd7' })
  @IsString()
  transactionId!: string;
}

export class BonumWebhookDto {
  @ApiProperty({ example: 'PAYMENT' })
  @IsString()
  type!: string;

  @ApiProperty({ example: 'SUCCESS' })
  @IsString()
  status!: string;

  @ApiProperty({ example: 'Successful', required: false, nullable: true })
  @IsOptional()
  @IsString()
  message?: string | null;

  @ApiProperty({ type: BonumWebhookBodyDto })
  @IsObject()
  body!: Record<string, unknown>;
}

export class BonumWebhookResponseDto {
  @ApiProperty({ example: true })
  received!: boolean;

  @ApiProperty({ example: false })
  duplicate!: boolean;

  @ApiProperty({ example: true })
  processed!: boolean;

  @ApiProperty({ example: 'topup-3a2d8a9e-7b34-4cc7-9648-6f652df27fd7' })
  transactionId!: string;

  @ApiProperty({ example: 'paid' })
  invoiceStatus!: 'pending' | 'paid' | 'failed' | 'expired';
}
