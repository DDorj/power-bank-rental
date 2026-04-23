import type { StationDetail } from '../stations/stations.types.js';
import type { WalletSummary } from '../wallet/wallet.types.js';

export interface QrScanResolveResult {
  station: Pick<
    StationDetail,
    | 'id'
    | 'name'
    | 'address'
    | 'status'
    | 'mqttDeviceId'
    | 'lastHeartbeatAt'
    | 'lat'
    | 'lng'
    | 'availableSlots'
    | 'occupiedSlots'
    | 'online'
    | 'supportsReturn'
    | 'inventorySummary'
  >;
  detectedSlot: {
    id: string;
    slotIndex: number;
    status: string;
    powerBankId: string | null;
    powerBankStatus: string | null;
    isRentable: boolean;
  } | null;
  wallet: Pick<WalletSummary, 'balance' | 'frozenAmount' | 'availableBalance'>;
  canStartRental: boolean;
  reason:
    | 'ready'
    | 'station_offline'
    | 'slot_unavailable'
    | 'station_unavailable';
}
