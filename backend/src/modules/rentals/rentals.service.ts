import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../common/redis/redis.service.js';
import type { EnvConfig } from '../../config/env.schema.js';
import { WalletService } from '../wallet/wallet.service.js';
import { RentalsRepository } from './rentals.repository.js';
import { CabinetCommandService } from '../iot/cabinet-command.service.js';
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
  StartRentalPreview,
  ReturnStationOption,
} from './rentals.types.js';

const RENTAL_LOCK_TTL_MS = 10_000;
const WALLET_LOCK_TTL_MS = 5_000;
const CABINET_SLOT_LOCK_TTL_MS = 65_000;

@Injectable()
export class RentalsService {
  constructor(
    private readonly repo: RentalsRepository,
    private readonly redis: RedisService,
    private readonly walletService: WalletService,
    private readonly cabinetCommands: CabinetCommandService,
    private readonly config: ConfigService<EnvConfig, true>,
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
      const cabinetId = await this.cabinetCommands.requireOnlineCabinet(
        params.stationId,
      );
      const releaseCabinetSlot = await this.redis.acquireLock(
        `cabinet:${cabinetId}:slot:${params.slotId}`,
        CABINET_SLOT_LOCK_TTL_MS,
      );

      try {
        // C-6: hold wallet lock so applyInExistingTx is protected
        const releaseWallet = await this.redis.acquireLock(
          `wallet:${params.userId}`,
          WALLET_LOCK_TTL_MS,
        );

        try {
          const prepared = await this.repo.$transaction(async (tx) => {
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

            return {
              powerBankId: slot.powerBank.id,
              powerBankSerial: slot.powerBank.serialNumber,
              slotId: slot.id,
              slotIndex: slot.slotIndex,
              depositAmount: pricing.depositAmount,
            };
          });

          try {
            await this.cabinetCommands.releaseSlot(cabinetId, {
              slotId: prepared.slotId,
              slotIndex: prepared.slotIndex,
            });
          } catch (error) {
            await this.releaseFrozenDeposit(
              params.userId,
              prepared.depositAmount,
              prepared.powerBankId,
              'Cabinet нээгдээгүй тул барьцаа суллах',
            );
            throw error;
          }

          try {
            return await this.repo.$transaction(async (tx) => {
              const slot = await this.repo.findSlotWithPowerBankInTx(
                tx,
                params.slotId,
              );

              if (!slot || slot.stationId !== params.stationId)
                throw new SlotNotFoundException();
              if (
                !slot.powerBank ||
                slot.powerBank.id !== prepared.powerBankId
              ) {
                throw new SlotEmptyException();
              }
              if (slot.powerBank.status !== 'idle') {
                throw new PowerBankNotIdleException();
              }

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
          } catch (error) {
            await this.releaseFrozenDeposit(
              params.userId,
              prepared.depositAmount,
              prepared.powerBankId,
              `Cabinet release амжилтгүй тул барьцаа суллах`,
            );
            throw error;
          }
        } finally {
          await releaseWallet();
        }
      } finally {
        await releaseCabinetSlot();
      }
    } finally {
      await releaseRental();
    }
  }

  async startWithAutoSelect(
    userId: string,
    stationId: string,
  ): Promise<RentalRecord> {
    const slot = await this.repo.findFirstRentableSlotByStation(stationId);
    if (!slot || !slot.powerBank) {
      throw new SlotEmptyException();
    }

    return this.start({
      userId,
      stationId,
      slotId: slot.id,
    });
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
    const cabinetId = await this.cabinetCommands.requireOnlineCabinet(
      params.stationId,
    );

    const returnedAt = new Date();
    const { chargeAmount } = this.calculateCost(
      rental.startedAt,
      returnedAt,
      pricing,
    );

    const releaseCabinetSlot = await this.redis.acquireLock(
      `cabinet:${cabinetId}:slot:${params.slotId}`,
      CABINET_SLOT_LOCK_TTL_MS,
    );

    // C-6: hold wallet lock so applyInExistingTx is protected
    const releaseWallet = await this.redis.acquireLock(
      `wallet:${params.userId}`,
      WALLET_LOCK_TTL_MS,
    );

    try {
      await this.cabinetCommands.lockSlot(cabinetId, {
        slotId: slot.id,
        slotIndex: slot.slotIndex,
      });

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

        await this.walletService.applyInExistingTx(tx, {
          userId: params.userId,
          type: 'unfreeze',
          amount: rental.depositAmount,
          referenceId: rental.id,
          description: `Барьцаа суллах`,
        });

        if (chargeAmount > 0) {
          await this.walletService.applyInExistingTx(tx, {
            userId: params.userId,
            type: 'charge',
            amount: chargeAmount,
            referenceId: rental.id,
            description: `Түрээсийн төлбөр`,
          });
        }

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
      await releaseCabinetSlot();
    }
  }

  async returnWithAutoSelect(
    rentalId: string,
    userId: string,
    stationId: string,
  ): Promise<RentalRecord> {
    const slot = await this.repo.findFirstEmptySlotByStation(stationId);
    if (!slot) throw new SlotOccupiedException();

    return this.return({
      rentalId,
      userId,
      stationId,
      slotId: slot.id,
    });
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

  async getReturnStations(
    rentalId: string,
    userId: string,
    params: {
      lat: number;
      lng: number;
      radiusKm: number;
      limit: number;
    },
  ): Promise<ReturnStationOption[]> {
    const rental = await this.repo.findByIdAndUser(rentalId, userId);
    if (!rental) throw new RentalNotFoundException();
    if (rental.status !== 'active') {
      throw new ForbiddenException({
        code: 'RENTAL_NOT_ACTIVE',
        message: 'Түрээс идэвхтэй биш байна',
      });
    }

    const stations = await this.repo.findNearbyReturnStations(params);
    return stations.map((station) => ({
      ...station,
      online: this.isStationOnline(station),
      supportsReturn: station.emptySlots > 0,
    }));
  }

  async previewStart(
    userId: string,
    stationId: string,
    slotId: string,
  ): Promise<StartRentalPreview> {
    const [activeRental, pricing, slot, wallet] = await Promise.all([
      this.repo.findActiveByUser(userId),
      this.repo.getDefaultPricing(),
      this.repo.findSlotWithPowerBank(slotId),
      this.walletService.getOrCreate(userId),
    ]);

    if (!pricing) throw new NoPricingRuleException();
    if (!slot || slot.stationId !== stationId)
      throw new SlotNotFoundException();
    if (!slot.powerBank) throw new SlotEmptyException();
    if (slot.powerBank.status !== 'idle') throw new PowerBankNotIdleException();

    const walletAvailableBalance = wallet.availableBalance;
    const sufficientBalance = walletAvailableBalance >= pricing.depositAmount;
    const hasActiveRental = activeRental !== null;

    return {
      stationId,
      slotId: slot.id,
      slotIndex: slot.slotIndex,
      powerBankId: slot.powerBank.id,
      powerBankSerialNumber: slot.powerBank.serialNumber,
      powerBankChargeLevel: slot.powerBank.chargeLevel,
      depositAmount: pricing.depositAmount,
      ratePerHour: pricing.ratePerHour,
      dailyMax: pricing.dailyMax,
      walletAvailableBalance,
      sufficientBalance,
      hasActiveRental,
      canStartRental: sufficientBalance && !hasActiveRental,
    };
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

  private async releaseFrozenDeposit(
    userId: string,
    amount: number,
    referenceId: string,
    description: string,
  ): Promise<void> {
    await this.repo.$transaction(async (tx) => {
      await this.walletService.applyInExistingTx(tx, {
        userId,
        type: 'unfreeze',
        amount,
        referenceId,
        description,
      });
    });
  }

  private isStationOnline(station: {
    mqttDeviceId: string | null;
    lastHeartbeatAt: Date | null;
  }): boolean {
    const mqttUrl = this.config.get('MQTT_URL', { infer: true });
    if (!mqttUrl) {
      return false;
    }

    const heartbeatTimeoutMs =
      this.config.get('MQTT_HEARTBEAT_TIMEOUT_MS', { infer: true }) ?? 90_000;
    const cutoff = Date.now() - heartbeatTimeoutMs;

    return (
      station.mqttDeviceId !== null &&
      station.lastHeartbeatAt !== null &&
      station.lastHeartbeatAt.getTime() >= cutoff
    );
  }
}
