import { Injectable } from '@nestjs/common';
import { RentalsService } from '../rentals/rentals.service.js';
import { StationsService } from '../stations/stations.service.js';
import type { NearbyParams } from '../stations/stations.types.js';
import { WalletService } from '../wallet/wallet.service.js';
import type { AppHomeSummary } from './app-home.types.js';

@Injectable()
export class AppHomeService {
  constructor(
    private readonly walletService: WalletService,
    private readonly rentalsService: RentalsService,
    private readonly stationsService: StationsService,
  ) {}

  async getSummary(
    userId: string,
    params: Pick<NearbyParams, 'lat' | 'lng' | 'radiusKm' | 'limit'>,
  ): Promise<AppHomeSummary> {
    const [wallet, activeRental, nearbyStations] = await Promise.all([
      this.walletService.getOrCreate(userId),
      this.rentalsService.getActive(userId),
      this.stationsService.findNearby(params),
    ]);

    return {
      wallet,
      activeRental,
      nearbyStations,
    };
  }
}
