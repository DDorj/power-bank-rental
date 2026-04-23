import type { RentalRecord } from '../rentals/rentals.types.js';
import type { StationNearbyRow } from '../stations/stations.types.js';
import type { WalletSummary } from '../wallet/wallet.types.js';

export interface AppHomeSummary {
  wallet: WalletSummary;
  activeRental: RentalRecord | null;
  nearbyStations: StationNearbyRow[];
}
