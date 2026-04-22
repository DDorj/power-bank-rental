import type { RentalStatus } from '../../../generated/prisma/enums.js';

export interface RentalRecord {
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
  startedAt: Date;
  returnedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PricingRuleRecord {
  id: string;
  ratePerHour: number;
  dailyMax: number;
  depositAmount: number;
  isDefault: boolean;
  createdAt: Date;
}

export interface StartRentalParams {
  userId: string;
  stationId: string;
  slotId: string;
}

export interface ReturnRentalParams {
  rentalId: string;
  userId: string;
  stationId: string;
  slotId: string;
}

export interface RentalCostResult {
  durationMinutes: number;
  chargeAmount: number;
}
