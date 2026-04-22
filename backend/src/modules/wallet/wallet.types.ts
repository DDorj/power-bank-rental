import type { WalletTransactionType } from '../../../generated/prisma/enums.js';

export interface WalletRecord {
  id: string;
  userId: string;
  balance: number;
  frozenAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface WalletTransactionRecord {
  id: string;
  walletId: string;
  type: WalletTransactionType;
  amount: number;
  balanceAfter: number;
  frozenAfter: number;
  referenceId: string | null;
  description: string | null;
  createdAt: Date;
}

export interface ApplyTransactionParams {
  userId: string;
  type: WalletTransactionType;
  amount: number;
  referenceId?: string;
  description?: string;
}

export interface WalletSummary extends WalletRecord {
  availableBalance: number;
}
