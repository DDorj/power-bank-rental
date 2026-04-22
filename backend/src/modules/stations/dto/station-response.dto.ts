import { ApiProperty } from '@nestjs/swagger';

const STATION_STATUSES = ['active', 'inactive', 'maintenance'] as const;
const SLOT_STATUSES = ['empty', 'occupied', 'faulty'] as const;
const POWER_BANK_STATUSES = ['idle', 'rented', 'charging', 'faulty'] as const;

export class PowerBankResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'PB-001' })
  serialNumber!: string;

  @ApiProperty({ enum: POWER_BANK_STATUSES, example: 'idle' })
  status!: (typeof POWER_BANK_STATUSES)[number];

  @ApiProperty({ example: 86 })
  chargeLevel!: number;

  @ApiProperty({ format: 'uuid', nullable: true })
  stationId!: string | null;

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

export class StationSlotResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  stationId!: string;

  @ApiProperty({ example: 0 })
  slotIndex!: number;

  @ApiProperty({ enum: SLOT_STATUSES, example: 'occupied' })
  status!: (typeof SLOT_STATUSES)[number];

  @ApiProperty({ format: 'uuid', nullable: true })
  powerBankId!: string | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-04-22T10:30:00.000Z',
  })
  updatedAt!: Date;

  @ApiProperty({ type: PowerBankResponseDto, nullable: true })
  powerBank!: PowerBankResponseDto | null;
}

export class StationResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Shangri-La Mall Station' })
  name!: string;

  @ApiProperty({ example: 'Ulaanbaatar, SBD, Olympic street 19A' })
  address!: string;

  @ApiProperty({ enum: STATION_STATUSES, example: 'active' })
  status!: (typeof STATION_STATUSES)[number];

  @ApiProperty({ example: 12 })
  totalSlots!: number;

  @ApiProperty({ example: 'station-01', nullable: true })
  mqttDeviceId!: string | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-04-22T10:30:00.000Z',
    nullable: true,
  })
  lastHeartbeatAt!: Date | null;

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

  @ApiProperty({ example: 47.9189 })
  lat!: number;

  @ApiProperty({ example: 106.9176 })
  lng!: number;
}

export class StationNearbyResponseDto extends StationResponseDto {
  @ApiProperty({ example: 132.5 })
  distanceMeters!: number;

  @ApiProperty({ example: 4 })
  availableSlots!: number;
}

export class StationDetailResponseDto extends StationResponseDto {
  @ApiProperty({ example: 4 })
  availableSlots!: number;

  @ApiProperty({ type: StationSlotResponseDto, isArray: true })
  slots!: StationSlotResponseDto[];
}
