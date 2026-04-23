import { ApiProperty } from '@nestjs/swagger';

class AdminUsersOverviewDto {
  @ApiProperty({ example: 1240 })
  total!: number;

  @ApiProperty({ example: 1193 })
  active!: number;

  @ApiProperty({ example: 3 })
  admins!: number;

  @ApiProperty({ example: 420 })
  kycVerified!: number;
}

class AdminStationsOverviewDto {
  @ApiProperty({ example: 12 })
  total!: number;

  @ApiProperty({ example: 10 })
  active!: number;

  @ApiProperty({ example: 1 })
  inactive!: number;

  @ApiProperty({ example: 1 })
  maintenance!: number;

  @ApiProperty({ example: 8 })
  online!: number;

  @ApiProperty({ example: 2 })
  offline!: number;

  @ApiProperty({ example: 96 })
  totalSlots!: number;

  @ApiProperty({ example: 37 })
  availablePowerBanks!: number;
}

class AdminRentalsOverviewDto {
  @ApiProperty({ example: 11 })
  active!: number;

  @ApiProperty({ example: 823 })
  completed!: number;

  @ApiProperty({ example: 2 })
  overdue!: number;

  @ApiProperty({ example: 41 })
  completedToday!: number;
}

class AdminPaymentsOverviewDto {
  @ApiProperty({ example: 4 })
  pendingInvoices!: number;

  @ApiProperty({ example: 18 })
  paidToday!: number;

  @ApiProperty({ example: 154000 })
  totalTopupAmount!: number;
}

class AdminWalletOverviewDto {
  @ApiProperty({ example: 325000 })
  totalBalance!: number;

  @ApiProperty({ example: 24000 })
  totalFrozenAmount!: number;
}

export class AdminDashboardOverviewResponseDto {
  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-04-23T02:00:00.000Z',
  })
  generatedAt!: string;

  @ApiProperty({ type: AdminUsersOverviewDto })
  users!: AdminUsersOverviewDto;

  @ApiProperty({ type: AdminStationsOverviewDto })
  stations!: AdminStationsOverviewDto;

  @ApiProperty({ type: AdminRentalsOverviewDto })
  rentals!: AdminRentalsOverviewDto;

  @ApiProperty({ type: AdminPaymentsOverviewDto })
  payments!: AdminPaymentsOverviewDto;

  @ApiProperty({ type: AdminWalletOverviewDto })
  wallet!: AdminWalletOverviewDto;
}
