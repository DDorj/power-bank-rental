import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type { PrismaClient } from '../../../generated/prisma/client.js';
import type { RentalRecord, PricingRuleRecord } from './rentals.types.js';

type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

export interface SlotRow {
  id: string;
  stationId: string;
  slotIndex: number;
  status: string;
  powerBankId: string | null;
  updatedAt: Date;
}

export interface SlotWithPowerBank extends SlotRow {
  powerBank: {
    id: string;
    serialNumber: string;
    status: string;
    chargeLevel: number;
    stationId: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
}

@Injectable()
export class RentalsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveByUser(userId: string): Promise<RentalRecord | null> {
    return this.prisma.rental.findFirst({
      where: { userId, status: 'active' },
    });
  }

  findByIdAndUser(id: string, userId: string): Promise<RentalRecord | null> {
    return this.prisma.rental.findFirst({ where: { id, userId } });
  }

  findByUser(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<RentalRecord[]> {
    return this.prisma.rental.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  countByUser(userId: string): Promise<number> {
    return this.prisma.rental.count({ where: { userId } });
  }

  getDefaultPricing(): Promise<PricingRuleRecord | null> {
    return this.prisma.pricingRule.findFirst({ where: { isDefault: true } });
  }

  // L-5: slot query methods moved from service

  // Called inside $transaction for start flow (C-4: inside tx to avoid race)
  findSlotWithPowerBankInTx(
    tx: Tx,
    slotId: string,
  ): Promise<SlotWithPowerBank | null> {
    return tx.slot.findUnique({
      where: { id: slotId },
      include: { powerBank: true },
    });
  }

  // Called outside tx for return flow slot validation
  findSlotById(slotId: string): Promise<SlotRow | null> {
    return this.prisma.slot.findUnique({
      where: { id: slotId },
    });
  }

  createRental(
    tx: Tx,
    params: {
      userId: string;
      powerBankId: string;
      startStationId: string;
      startSlotId: string;
      depositAmount: number;
    },
  ): Promise<RentalRecord> {
    return tx.rental.create({ data: params });
  }

  completeRental(
    tx: Tx,
    rentalId: string,
    params: {
      endStationId: string;
      endSlotId: string;
      chargeAmount: number;
      returnedAt: Date;
    },
  ): Promise<RentalRecord> {
    return tx.rental.update({
      where: { id: rentalId },
      data: { ...params, status: 'completed' },
    });
  }

  $transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}
