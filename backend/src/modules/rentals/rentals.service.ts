import { ForbiddenException, Injectable } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service.js';
import { WalletService } from '../wallet/wallet.service.js';
import { RentalsRepository } from './rentals.repository.js';
import {
  ActiveRentalExistsException,
  NoPricingRuleException,
  PowerBankNotIdleException,
  RentalNotFoundException,
  SlotEmptyException,
  SlotNotFoundException,
  SlotOccupiedException,
} from './rentals.errors.js';
import type {
  RentalRecord,
  StartRentalParams,
  ReturnRentalParams,
  RentalCostResult,
} from './rentals.types.js';

const RENTAL_LOCK_TTL_MS = 10_000;
const WALLET_LOCK_TTL_MS = 5_000;

@Injectable()
export class RentalsService {
  constructor(
    private readonly repo: RentalsRepository,
    private readonly redis: RedisService,
    private readonly walletService: WalletService,
  ) {}

  async start(params: StartRentalParams): Promise<RentalRecord> {
    const releaseRental = await this.redis.acquireLock(
      `rental-start:${params.userId}`,
      RENTAL_LOCK_TTL_MS,
    );

    try {
      const active = await this.repo.findActiveByUser(params.userId);
      if (active) throw new ActiveRentalExistsException();

      const pricing = await this.repo.getDefaultPricing();
      if (!pricing) throw new NoPricingRuleException();

      // C-6: hold wallet lock so applyInExistingTx is protected
      const releaseWallet = await this.redis.acquireLock(
        `wallet:${params.userId}`,
        WALLET_LOCK_TTL_MS,
      );

      try {
        return await this.repo.$transaction(async (tx) => {
          // C-4: slot check inside tx — avoids race between read and tx start
          const slot = await this.repo.findSlotWithPowerBankInTx(
            tx,
            params.slotId,
          );

          if (!slot || slot.stationId !== params.stationId)
            throw new SlotNotFoundException();
          if (!slot.powerBank) throw new SlotEmptyException();
          if (slot.powerBank.status !== 'idle')
            throw new PowerBankNotIdleException();

          await this.walletService.applyInExistingTx(tx, {
            userId: params.userId,
            type: 'freeze',
            amount: pricing.depositAmount,
            referenceId: slot.powerBank.id,
            description: `Power bank ${slot.powerBank.serialNumber} барьцаа`,
          });

          await tx.powerBank.update({
            where: { id: slot.powerBank.id },
            data: { status: 'rented', stationId: null },
          });

          await tx.slot.update({
            where: { id: slot.id },
            data: { status: 'empty', powerBankId: null },
          });

          return this.repo.createRental(tx, {
            userId: params.userId,
            powerBankId: slot.powerBank.id,
            startStationId: params.stationId,
            startSlotId: params.slotId,
            depositAmount: pricing.depositAmount,
          });
        });
      } finally {
        await releaseWallet();
      }
    } finally {
      await releaseRental();
    }
  }

  async return(params: ReturnRentalParams): Promise<RentalRecord> {
    const rental = await this.repo.findByIdAndUser(
      params.rentalId,
      params.userId,
    );
    if (!rental) throw new RentalNotFoundException();
    if (rental.status !== 'active') {
      throw new ForbiddenException({
        code: 'RENTAL_NOT_ACTIVE',
        message: 'Түрээс идэвхтэй биш байна',
      });
    }

    // L-5: use repo instead of direct PrismaService
    const slot = await this.repo.findSlotById(params.slotId);
    if (!slot || slot.stationId !== params.stationId)
      throw new SlotNotFoundException();
    if (slot.status !== 'empty') throw new SlotOccupiedException();

    const pricing = await this.repo.getDefaultPricing();
    if (!pricing) throw new NoPricingRuleException();

    const returnedAt = new Date();
    const { chargeAmount } = this.calculateCost(
      rental.startedAt,
      returnedAt,
      pricing,
    );

    // C-6: hold wallet lock so applyInExistingTx is protected
    const releaseWallet = await this.redis.acquireLock(
      `wallet:${params.userId}`,
      WALLET_LOCK_TTL_MS,
    );

    try {
      return await this.repo.$transaction(async (tx) => {
        // H-8: verify power bank is still in 'rented' state
        const powerBank = await tx.powerBank.findUnique({
          where: { id: rental.powerBankId },
        });
        if (!powerBank || powerBank.status !== 'rented') {
          throw new ForbiddenException({
            code: 'POWER_BANK_STATE_MISMATCH',
            message: 'Power bank төлөв тохирохгүй байна',
          });
        }

        if (chargeAmount > 0) {
          await this.walletService.applyInExistingTx(tx, {
            userId: params.userId,
            type: 'charge',
            amount: chargeAmount,
            referenceId: rental.id,
            description: `Түрээсийн төлбөр`,
          });
        }

        await this.walletService.applyInExistingTx(tx, {
          userId: params.userId,
          type: 'unfreeze',
          amount: rental.depositAmount,
          referenceId: rental.id,
          description: `Барьцаа суллах`,
        });

        await tx.powerBank.update({
          where: { id: rental.powerBankId },
          data: { status: 'charging', stationId: params.stationId },
        });

        await tx.slot.update({
          where: { id: slot.id },
          data: { status: 'occupied', powerBankId: rental.powerBankId },
        });

        return this.repo.completeRental(tx, rental.id, {
          endStationId: params.stationId,
          endSlotId: params.slotId,
          chargeAmount,
          returnedAt,
        });
      });
    } finally {
      await releaseWallet();
    }
  }

  getActive(userId: string): Promise<RentalRecord | null> {
    return this.repo.findActiveByUser(userId);
  }

  async getHistory(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ data: RentalRecord[]; total: number }> {
    const offset = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.repo.findByUser(userId, limit, offset),
      this.repo.countByUser(userId),
    ]);
    return { data, total };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  calculateCost(
    startedAt: Date,
    returnedAt: Date,
    pricing: { ratePerHour: number; dailyMax: number },
  ): RentalCostResult {
    const durationMs = returnedAt.getTime() - startedAt.getTime();
    const durationMinutes = Math.ceil(durationMs / 60_000);
    const durationHours = durationMinutes / 60;

    const rawCharge = Math.ceil(durationHours * pricing.ratePerHour);
    const chargeAmount = Math.min(rawCharge, pricing.dailyMax);

    return { durationMinutes, chargeAmount };
  }
}
