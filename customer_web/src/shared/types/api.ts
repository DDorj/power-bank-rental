export type KycStatus = "none" | "pending" | "verified" | "rejected";
export type RentalStatus = "active" | "completed" | "overdue" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "failed" | "expired";
export type WalletTransactionType =
  | "topup"
  | "freeze"
  | "unfreeze"
  | "charge"
  | "refund"
  | "adjustment";
export type PowerBankStatus = "idle" | "rented" | "charging" | "faulty";
export type StationStatus = "active" | "inactive" | "maintenance";
export type SlotStatus = "empty" | "occupied" | "faulty";
export type AuthProvider = "google" | "phone_otp" | "email_password" | "dan";

export interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
}

export interface ApiErrorEnvelope {
  success: false;
  code: string;
  message: string;
  statusCode: number;
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
}

export interface UserIdentity {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  primaryAuthMethod: AuthProvider;
  trustTier: number;
  kycStatus: KycStatus;
  kycVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface OtpVerifyPayload extends AuthTokens {
  user: UserIdentity;
}

export interface NearbyStation {
  id: string;
  name: string;
  address: string;
  status: StationStatus;
  totalSlots: number;
  mqttDeviceId: string | null;
  lastHeartbeatAt: string | null;
  createdAt: string;
  updatedAt: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  availableSlots: number;
  online: boolean;
}

export interface CustomerStationDetail {
  id: string;
  name: string;
  address: string;
  status: StationStatus;
  totalSlots: number;
  mqttDeviceId: string | null;
  lastHeartbeatAt: string | null;
  createdAt: string;
  updatedAt: string;
  lat: number;
  lng: number;
  availableSlots: number;
  occupiedSlots: number;
  online: boolean;
  supportsReturn: boolean;
  inventorySummary: {
    totalPowerBanks: number;
    availableCount: number;
    chargingCount: number;
    rentedCount: number;
    faultyCount: number;
  };
  slots: Array<{
    id: string;
    stationId: string;
    slotIndex: number;
    status: SlotStatus;
    powerBankId: string | null;
    updatedAt: string;
    powerBank: {
      id: string;
      serialNumber: string;
      status: PowerBankStatus;
      chargeLevel: number;
      stationId: string | null;
      createdAt: string;
      updatedAt: string;
    } | null;
  }>;
}

export interface WalletSummary {
  id: string;
  userId: string;
  balance: number;
  frozenAmount: number;
  availableBalance: number;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: WalletTransactionType;
  amount: number;
  balanceAfter: number;
  frozenAfter: number;
  referenceId: string | null;
  description: string | null;
  createdAt: string;
}

export interface WalletTopupInvoice {
  id: string;
  userId: string;
  transactionId: string;
  invoiceId: string;
  amount: number;
  status: PaymentStatus;
  followUpLink: string;
  expiresAt: string;
  createdAt: string;
}

export interface WalletTransactionPage {
  data: WalletTransaction[];
  total: number;
}

export interface CustomerRental {
  id: string;
  userId: string;
  powerBankId: string;
  startStationId: string;
  startSlotId: string;
  endStationId: string | null;
  endSlotId: string | null;
  status: RentalStatus;
  depositAmount: number;
  chargeAmount: number | null;
  startedAt: string;
  returnedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppHomeSummary {
  wallet: WalletSummary;
  activeRental: CustomerRental | null;
  nearbyStations: NearbyStation[];
}

export interface AppScanResolveResult {
  station: {
    id: string;
    name: string;
    address: string;
    status: StationStatus;
    mqttDeviceId: string | null;
    lastHeartbeatAt: string | null;
    lat: number;
    lng: number;
    availableSlots: number;
    occupiedSlots: number;
    online: boolean;
    supportsReturn: boolean;
    inventorySummary: {
      totalPowerBanks: number;
      availableCount: number;
      chargingCount: number;
      rentedCount: number;
      faultyCount: number;
    };
  };
  detectedSlot: {
    id: string;
    slotIndex: number;
    status: SlotStatus;
    powerBankId: string | null;
    powerBankStatus: PowerBankStatus | null;
    isRentable: boolean;
  } | null;
  wallet: Pick<WalletSummary, "balance" | "frozenAmount" | "availableBalance">;
  canStartRental: boolean;
  reason: "ready" | "station_offline" | "slot_unavailable" | "station_unavailable";
}

export interface AppRentalPreview {
  stationId: string;
  slotId: string;
  slotIndex: number;
  powerBankId: string;
  powerBankSerialNumber: string;
  powerBankChargeLevel: number;
  depositAmount: number;
  ratePerHour: number;
  dailyMax: number;
  walletAvailableBalance: number;
  sufficientBalance: boolean;
  hasActiveRental: boolean;
  canStartRental: boolean;
}

export interface ReturnStationOption {
  id: string;
  name: string;
  address: string;
  status: StationStatus;
  mqttDeviceId: string | null;
  lastHeartbeatAt: string | null;
  lat: number;
  lng: number;
  distanceMeters: number;
  emptySlots: number;
  online: boolean;
  supportsReturn: boolean;
}

export interface CustomerRentalReceipt {
  id: string;
  status: RentalStatus;
  powerBankId: string;
  startStationId: string;
  startStationName: string;
  endStationId: string | null;
  endStationName: string;
  depositAmount: number;
  chargeAmount: number | null;
  startedAt: string;
  returnedAt: string | null;
}
