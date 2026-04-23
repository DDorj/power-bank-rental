export type Role = "user" | "admin";
export type KycStatus = "none" | "pending" | "verified" | "rejected";
export type RentalStatus = "active" | "completed" | "overdue" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "failed" | "expired";
export type PaymentPurpose = "topup" | "direct_payment";
export type WalletTransactionType =
  | "topup"
  | "freeze"
  | "unfreeze"
  | "charge"
  | "refund"
  | "adjustment";
export type PowerBankStatus = "idle" | "rented" | "charging" | "faulty";
export type StationStatus = "active" | "inactive" | "maintenance";
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

export interface DashboardOverview {
  generatedAt: string;
  users: {
    total: number;
    active: number;
    admins: number;
    kycVerified: number;
  };
  stations: {
    total: number;
    active: number;
    inactive: number;
    maintenance: number;
    online: number;
    offline: number;
    totalSlots: number;
    availablePowerBanks: number;
  };
  rentals: {
    active: number;
    completed: number;
    overdue: number;
    completedToday: number;
  };
  payments: {
    pendingInvoices: number;
    paidToday: number;
    totalTopupAmount: number;
  };
  wallet: {
    totalBalance: number;
    totalFrozenAmount: number;
  };
}

export interface StationListItem {
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
}

export interface StationDetail extends StationListItem {
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
    status: "empty" | "occupied" | "faulty";
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

export interface CreateStationInput {
  name: string;
  address: string;
  lat: number;
  lng: number;
  totalSlots: number;
  mqttDeviceId?: string;
}

export interface UpdateStationInput {
  name?: string;
  address?: string;
  lat?: number;
  lng?: number;
  status?: StationStatus;
  mqttDeviceId?: string;
}

export interface AdminUserListItem {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  role: Role;
  trustTier: number;
  kycStatus: KycStatus;
  isActive: boolean;
  walletBalance: number;
  walletFrozenAmount: number;
  activeRentalCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserDetail extends AdminUserListItem {
  primaryAuthMethod: AuthProvider;
  kycVerifiedAt: string | null;
}

export interface AdminRental {
  id: string;
  userId: string;
  userName: string;
  userPhone: string | null;
  powerBankId: string;
  powerBankSerialNumber: string;
  startStationId: string;
  startStationName: string;
  endStationId: string | null;
  endStationName: string | null;
  status: RentalStatus;
  depositAmount: number;
  chargeAmount: number | null;
  startedAt: string;
  returnedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPayment {
  id: string;
  userId: string;
  userName: string;
  userPhone: string | null;
  transactionId: string;
  invoiceId: string;
  amount: number;
  purpose: PaymentPurpose;
  status: PaymentStatus;
  followUpLink: string;
  expiresAt: string;
  paidAt: string | null;
  paymentTransactionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentWebhookEvent {
  id: string;
  transactionId: string;
  eventType: "payment" | "refund";
  receivedAt: string;
  processedAt: string | null;
}

export interface AdminPaymentDetail extends AdminPayment {
  webhookEvents: PaymentWebhookEvent[];
}

export interface AdminWalletTransaction {
  id: string;
  walletId: string;
  userId: string;
  userName: string;
  userPhone: string | null;
  type: WalletTransactionType;
  amount: number;
  balanceAfter: number;
  frozenAfter: number;
  referenceId: string | null;
  description: string | null;
  createdAt: string;
}

export interface AdminPowerBank {
  id: string;
  serialNumber: string;
  status: PowerBankStatus;
  chargeLevel: number;
  stationId: string | null;
  stationName: string | null;
  slotId: string | null;
  slotIndex: number | null;
  createdAt: string;
  updatedAt: string;
}
