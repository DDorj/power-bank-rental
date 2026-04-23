import { ApiProperty } from '@nestjs/swagger';

const USER_ROLES = ['user', 'admin'] as const;
const KYC_STATUSES = ['none', 'pending', 'verified', 'rejected'] as const;
const AUTH_METHODS = ['google', 'phone_otp', 'email_password', 'dan'] as const;
const RENTAL_STATUSES = [
  'active',
  'completed',
  'overdue',
  'cancelled',
] as const;
const POWER_BANK_STATUSES = ['idle', 'rented', 'charging', 'faulty'] as const;

export class AdminUserListItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Batzaya User' })
  name!: string;

  @ApiProperty({ example: '+97699000002', nullable: true })
  phone!: string | null;

  @ApiProperty({ example: 'user@example.mn', nullable: true })
  email!: string | null;

  @ApiProperty({ enum: USER_ROLES, example: 'user' })
  role!: (typeof USER_ROLES)[number];

  @ApiProperty({ example: 2 })
  trustTier!: number;

  @ApiProperty({ enum: KYC_STATUSES, example: 'verified' })
  kycStatus!: (typeof KYC_STATUSES)[number];

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: 15000 })
  walletBalance!: number;

  @ApiProperty({ example: 3000 })
  walletFrozenAmount!: number;

  @ApiProperty({ example: 1 })
  activeRentalCount!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class AdminUsersResponseDto {
  @ApiProperty({ type: AdminUserListItemDto, isArray: true })
  data!: AdminUserListItemDto[];

  @ApiProperty({ example: 42 })
  total!: number;
}

export class AdminUserDetailDto extends AdminUserListItemDto {
  @ApiProperty({ enum: AUTH_METHODS, example: 'phone_otp' })
  primaryAuthMethod!: (typeof AUTH_METHODS)[number];

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  kycVerifiedAt!: Date | null;
}

export class AdminRentalListItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ example: 'Saraa User' })
  userName!: string;

  @ApiProperty({ example: '+97699000003', nullable: true })
  userPhone!: string | null;

  @ApiProperty({ format: 'uuid' })
  powerBankId!: string;

  @ApiProperty({ example: 'PB-DEMO-001' })
  powerBankSerialNumber!: string;

  @ApiProperty({ format: 'uuid' })
  startStationId!: string;

  @ApiProperty({ example: 'Shangri-La Mall' })
  startStationName!: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  endStationId!: string | null;

  @ApiProperty({ example: 'State Department Store', nullable: true })
  endStationName!: string | null;

  @ApiProperty({ enum: RENTAL_STATUSES, example: 'active' })
  status!: (typeof RENTAL_STATUSES)[number];

  @ApiProperty({ example: 3000 })
  depositAmount!: number;

  @ApiProperty({ example: 500, nullable: true })
  chargeAmount!: number | null;

  @ApiProperty({ type: String, format: 'date-time' })
  startedAt!: Date;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  returnedAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class AdminRentalsResponseDto {
  @ApiProperty({ type: AdminRentalListItemDto, isArray: true })
  data!: AdminRentalListItemDto[];

  @ApiProperty({ example: 17 })
  total!: number;
}

export class AdminPowerBankListItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'PB-DEMO-001' })
  serialNumber!: string;

  @ApiProperty({ enum: POWER_BANK_STATUSES, example: 'idle' })
  status!: (typeof POWER_BANK_STATUSES)[number];

  @ApiProperty({ example: 92 })
  chargeLevel!: number;

  @ApiProperty({ format: 'uuid', nullable: true })
  stationId!: string | null;

  @ApiProperty({ example: 'Shangri-La Mall', nullable: true })
  stationName!: string | null;

  @ApiProperty({ format: 'uuid', nullable: true })
  slotId!: string | null;

  @ApiProperty({ example: 0, nullable: true })
  slotIndex!: number | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class AdminPowerBanksResponseDto {
  @ApiProperty({ type: AdminPowerBankListItemDto, isArray: true })
  data!: AdminPowerBankListItemDto[];

  @ApiProperty({ example: 24 })
  total!: number;
}
