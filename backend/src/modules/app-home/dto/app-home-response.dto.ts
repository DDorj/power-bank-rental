import { ApiProperty } from '@nestjs/swagger';
import { RentalResponseDto } from '../../rentals/dto/rental-response.dto.js';
import { StationNearbyResponseDto } from '../../stations/dto/station-response.dto.js';
import { WalletSummaryResponseDto } from '../../wallet/dto/wallet-response.dto.js';

export class AppHomeSummaryResponseDto {
  @ApiProperty({ type: WalletSummaryResponseDto })
  wallet!: WalletSummaryResponseDto;

  @ApiProperty({ type: RentalResponseDto, nullable: true })
  activeRental!: RentalResponseDto | null;

  @ApiProperty({ type: StationNearbyResponseDto, isArray: true })
  nearbyStations!: StationNearbyResponseDto[];
}
