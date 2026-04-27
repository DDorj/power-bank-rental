import { ApiProperty } from '@nestjs/swagger';

class AppScanStationInventoryDto {
  @ApiProperty({ example: 4 })
  totalPowerBanks!: number;

  @ApiProperty({ example: 2 })
  availableCount!: number;

  @ApiProperty({ example: 1 })
  chargingCount!: number;

  @ApiProperty({ example: 0 })
  rentedCount!: number;

  @ApiProperty({ example: 1 })
  faultyCount!: number;
}

class AppScanStationDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Shangri-La Mall' })
  name!: string;

  @ApiProperty({ example: 'Olympic street 19A, Ulaanbaatar' })
  address!: string;

  @ApiProperty({ example: 'active' })
  status!: string;

  @ApiProperty({ example: 'cabinet-demo-1', nullable: true })
  mqttDeviceId!: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lastHeartbeatAt!: Date | null;

  @ApiProperty({ example: 47.9136 })
  lat!: number;

  @ApiProperty({ example: 106.9155 })
  lng!: number;

  @ApiProperty({ example: 2 })
  availableSlots!: number;

  @ApiProperty({ example: 3 })
  occupiedSlots!: number;

  @ApiProperty({
    type: Boolean,
    example: true,
    nullable: true,
    description:
      'MQTT heartbeat-ийн дагуу кабинет онлайн эсэх. MQTT идэвхгүй бол null.',
  })
  online!: boolean | null;

  @ApiProperty({ example: true })
  supportsReturn!: boolean;

  @ApiProperty({ type: AppScanStationInventoryDto })
  inventorySummary!: AppScanStationInventoryDto;
}

class AppScanDetectedSlotDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 0 })
  slotIndex!: number;

  @ApiProperty({ example: 'occupied' })
  status!: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  powerBankId!: string | null;

  @ApiProperty({ example: 'idle', nullable: true })
  powerBankStatus!: string | null;

  @ApiProperty({ example: true })
  isRentable!: boolean;
}

class AppScanWalletDto {
  @ApiProperty({ example: 15000 })
  balance!: number;

  @ApiProperty({ example: 3000 })
  frozenAmount!: number;

  @ApiProperty({ example: 12000 })
  availableBalance!: number;
}

export class AppScanResolveResponseDto {
  @ApiProperty({ type: AppScanStationDto })
  station!: AppScanStationDto;

  @ApiProperty({ type: AppScanDetectedSlotDto, nullable: true })
  detectedSlot!: AppScanDetectedSlotDto | null;

  @ApiProperty({ type: AppScanWalletDto })
  wallet!: AppScanWalletDto;

  @ApiProperty({ example: true })
  canStartRental!: boolean;

  @ApiProperty({
    enum: [
      'ready',
      'station_offline',
      'slot_unavailable',
      'station_unavailable',
    ],
    example: 'ready',
  })
  reason!:
    | 'ready'
    | 'station_offline'
    | 'slot_unavailable'
    | 'station_unavailable';
}

export class AppRentalPreviewResponseDto {
  @ApiProperty({ format: 'uuid' })
  stationId!: string;

  @ApiProperty({ format: 'uuid' })
  slotId!: string;

  @ApiProperty({ example: 0 })
  slotIndex!: number;

  @ApiProperty({ format: 'uuid' })
  powerBankId!: string;

  @ApiProperty({ example: 'PB-DEMO-001' })
  powerBankSerialNumber!: string;

  @ApiProperty({ example: 80 })
  powerBankChargeLevel!: number;

  @ApiProperty({ example: 3000 })
  depositAmount!: number;

  @ApiProperty({ example: 500 })
  ratePerHour!: number;

  @ApiProperty({ example: 5000 })
  dailyMax!: number;

  @ApiProperty({ example: 12000 })
  walletAvailableBalance!: number;

  @ApiProperty({ example: true })
  sufficientBalance!: boolean;

  @ApiProperty({ example: false })
  hasActiveRental!: boolean;

  @ApiProperty({ example: true })
  canStartRental!: boolean;
}
