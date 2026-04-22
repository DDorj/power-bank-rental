import { ApiProperty } from '@nestjs/swagger';

const RENTAL_STATUSES = [
  'active',
  'completed',
  'overdue',
  'cancelled',
] as const;

export class RentalResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ format: 'uuid' })
  powerBankId!: string;

  @ApiProperty({ format: 'uuid' })
  startStationId!: string;

  @ApiProperty({ format: 'uuid' })
  startSlotId!: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  endStationId!: string | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  endSlotId!: string | null;

  @ApiProperty({ enum: RENTAL_STATUSES, example: 'active' })
  status!: (typeof RENTAL_STATUSES)[number];

  @ApiProperty({ example: 5000 })
  depositAmount!: number;

  @ApiProperty({ example: 1500, nullable: true })
  chargeAmount!: number | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-04-22T10:30:00.000Z',
  })
  startedAt!: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-04-22T11:00:00.000Z',
    nullable: true,
  })
  returnedAt!: Date | null;

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

export class RentalHistoryResponseDto {
  @ApiProperty({ type: RentalResponseDto, isArray: true })
  data!: RentalResponseDto[];

  @ApiProperty({ example: 24 })
  total!: number;
}
