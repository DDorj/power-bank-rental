export interface AdminDashboardOverview {
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

export interface AdminDashboardOverviewSnapshot {
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
    totalSlots: number;
    availablePowerBanks: number;
    records: Array<{
      mqttDeviceId: string | null;
      lastHeartbeatAt: Date | null;
    }>;
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

export interface AdminPaymentListItem {
  id: string;
  userId: string;
  userName: string;
  userPhone: string | null;
  transactionId: string;
  invoiceId: string;
  amount: number;
  purpose: 'topup' | 'direct_payment';
  status: 'pending' | 'paid' | 'failed' | 'expired';
  followUpLink: string;
  expiresAt: Date;
  paidAt: Date | null;
  paymentTransactionId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminPaymentDetail extends AdminPaymentListItem {
  webhookEvents: Array<{
    id: string;
    transactionId: string;
    eventType: 'payment' | 'refund';
    receivedAt: Date;
    processedAt: Date | null;
  }>;
}

export interface AdminWalletTransactionListItem {
  id: string;
  walletId: string;
  userId: string;
  userName: string;
  userPhone: string | null;
  type: 'topup' | 'freeze' | 'unfreeze' | 'charge' | 'refund' | 'adjustment';
  amount: number;
  balanceAfter: number;
  frozenAfter: number;
  referenceId: string | null;
  description: string | null;
  createdAt: Date;
}

export interface AdminUserListItem {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  role: 'user' | 'admin';
  trustTier: number;
  kycStatus: 'none' | 'pending' | 'verified' | 'rejected';
  isActive: boolean;
  walletBalance: number;
  walletFrozenAmount: number;
  activeRentalCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminUserDetail extends AdminUserListItem {
  primaryAuthMethod: 'google' | 'phone_otp' | 'email_password' | 'dan';
  kycVerifiedAt: Date | null;
}

export interface AdminRentalListItem {
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
  status: 'active' | 'completed' | 'overdue' | 'cancelled';
  depositAmount: number;
  chargeAmount: number | null;
  startedAt: Date;
  returnedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminPowerBankListItem {
  id: string;
  serialNumber: string;
  status: 'idle' | 'rented' | 'charging' | 'faulty';
  chargeLevel: number;
  stationId: string | null;
  stationName: string | null;
  slotId: string | null;
  slotIndex: number | null;
  createdAt: Date;
  updatedAt: Date;
}
