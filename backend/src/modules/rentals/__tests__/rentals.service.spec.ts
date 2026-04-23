import { jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

jest.mock('../../../common/prisma/prisma.service', () => ({
  PrismaService: jest.fn(),
}));

import { RentalsService } from '../rentals.service.js';
import { RentalsRepository } from '../rentals.repository.js';
import { RedisService } from '../../../common/redis/redis.service.js';
import { WalletService } from '../../wallet/wallet.service.js';
import { CabinetCommandService } from '../../iot/cabinet-command.service.js';
import {
  ActiveRentalExistsException,
  NoPricingRuleException,
  PowerBankNotIdleException,
  RentalNotFoundException,
  SlotEmptyException,
  SlotNotFoundException,
  SlotOccupiedException,
} from '../rentals.errors.js';
import type { RentalRecord, PricingRuleRecord } from '../rentals.types.js';

const mockPricing: PricingRuleRecord = {
  id: 'pricing-uuid-1',
  ratePerHour: 500,
  dailyMax: 5000,
  depositAmount: 3000,
  isDefault: true,
  createdAt: new Date(),
};

const mockRental: RentalRecord = {
  id: 'rental-uuid-1',
  userId: 'user-uuid-1',
  powerBankId: 'pb-uuid-1',
  startStationId: 'station-uuid-1',
  startSlotId: 'slot-uuid-1',
  endStationId: null,
  endSlotId: null,
  status: 'active',
  depositAmount: 3000,
  chargeAmount: null,
  startedAt: new Date(Date.now() - 3600000),
  returnedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockSlotWithPowerBank = {
  id: 'slot-uuid-1',
  stationId: 'station-uuid-1',
  slotIndex: 0,
  status: 'empty' as const,
  powerBankId: 'pb-uuid-1',
  updatedAt: new Date(),
  powerBank: {
    id: 'pb-uuid-1',
    serialNumber: 'PB-001',
    status: 'idle' as const,
    chargeLevel: 80,
    stationId: 'station-uuid-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

describe('RentalsService', () => {
  let service: RentalsService;
  let repo: jest.Mocked<RentalsRepository>;
  let redis: jest.Mocked<RedisService>;
  let walletService: jest.Mocked<WalletService>;
  let cabinetCommands: jest.Mocked<CabinetCommandService>;

  const mockRelease = jest.fn().mockResolvedValue(undefined);
  const mockCabinetAck = {
    commandId: 'command-uuid-1',
    status: 'ok' as const,
    errorCode: null,
    errorMessage: null,
    receivedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RentalsService,
        {
          provide: RentalsRepository,
          useValue: {
            findActiveByUser: jest.fn(),
            findByIdAndUser: jest.fn(),
            findByUser: jest.fn(),
            countByUser: jest.fn(),
            getDefaultPricing: jest.fn(),
            createRental: jest.fn(),
            completeRental: jest.fn(),
            $transaction: jest.fn(),
            findSlotWithPowerBankInTx: jest.fn(),
            findSlotById: jest.fn(),
            findSlotWithPowerBank: jest.fn(),
            findFirstRentableSlotByStation: jest.fn(),
            findFirstEmptySlotByStation: jest.fn(),
            findNearbyReturnStations: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: { acquireLock: jest.fn() },
        },
        {
          provide: WalletService,
          useValue: { applyInExistingTx: jest.fn(), getOrCreate: jest.fn() },
        },
        {
          provide: CabinetCommandService,
          useValue: {
            requireOnlineCabinet: jest.fn(),
            releaseSlot: jest.fn(),
            lockSlot: jest.fn(),
            getHealthStatus: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'MQTT_URL') return 'mqtt://localhost:1883';
              if (key === 'MQTT_HEARTBEAT_TIMEOUT_MS') return 90_000;
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(RentalsService);
    repo = module.get(RentalsRepository);
    redis = module.get(RedisService);
    walletService = module.get(WalletService);
    cabinetCommands = module.get(CabinetCommandService);

    redis.acquireLock.mockResolvedValue(mockRelease);
    mockRelease.mockClear();
    cabinetCommands.requireOnlineCabinet.mockResolvedValue('cabinet-uuid-1');
    cabinetCommands.releaseSlot.mockResolvedValue(mockCabinetAck);
    cabinetCommands.lockSlot.mockResolvedValue(mockCabinetAck);
  });

  const makeMockTx = () => ({
    powerBank: {
      update: jest.fn().mockResolvedValue({}),
      findUnique: jest
        .fn()
        .mockResolvedValue({ id: 'pb-uuid-1', status: 'rented' }),
    },
    slot: { update: jest.fn().mockResolvedValue({}) },
    wallet: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ id: 'w1', balance: 10000, frozenAmount: 0 }),
    },
  });

  // ─── start ───────────────────────────────────────────────────────────────

  describe('start', () => {
    it('creates rental on valid slot with idle power bank', async () => {
      repo.findActiveByUser.mockResolvedValue(null);
      repo.getDefaultPricing.mockResolvedValue(mockPricing);
      repo.findSlotWithPowerBankInTx.mockResolvedValue(mockSlotWithPowerBank);
      const mockTx = makeMockTx();
      repo.$transaction.mockImplementation(async (fn) => fn(mockTx as never));
      walletService.applyInExistingTx.mockResolvedValue({} as never);
      repo.createRental.mockResolvedValue(mockRental);

      const result = await service.start({
        userId: 'user-uuid-1',
        stationId: 'station-uuid-1',
        slotId: 'slot-uuid-1',
      });

      expect(result.status).toBe('active');
      expect(result.depositAmount).toBe(3000);
      expect(cabinetCommands.requireOnlineCabinet).toHaveBeenCalledWith(
        'station-uuid-1',
      );
      expect(cabinetCommands.releaseSlot).toHaveBeenCalledWith(
        'cabinet-uuid-1',
        { slotId: 'slot-uuid-1', slotIndex: 0 },
      );
      expect(mockRelease).toHaveBeenCalled();
    });

    it('throws ActiveRentalExistsException when user has active rental', async () => {
      repo.findActiveByUser.mockResolvedValue(mockRental);

      await expect(
        service.start({ userId: 'user-uuid-1', stationId: 'st', slotId: 'sl' }),
      ).rejects.toThrow(ActiveRentalExistsException);
    });

    it('throws NoPricingRuleException when no pricing configured', async () => {
      repo.findActiveByUser.mockResolvedValue(null);
      repo.getDefaultPricing.mockResolvedValue(null);

      await expect(
        service.start({
          userId: 'user-uuid-1',
          stationId: 'station-uuid-1',
          slotId: 'slot-uuid-1',
        }),
      ).rejects.toThrow(NoPricingRuleException);
    });

    it('throws SlotNotFoundException when slot not found', async () => {
      repo.findActiveByUser.mockResolvedValue(null);
      repo.getDefaultPricing.mockResolvedValue(mockPricing);
      repo.findSlotWithPowerBankInTx.mockResolvedValue(null);
      repo.$transaction.mockImplementation(async (fn) => fn({} as never));

      await expect(
        service.start({ userId: 'user-uuid-1', stationId: 'st', slotId: 'sl' }),
      ).rejects.toThrow(SlotNotFoundException);
    });

    it('throws SlotNotFoundException when slot belongs to different station', async () => {
      repo.findActiveByUser.mockResolvedValue(null);
      repo.getDefaultPricing.mockResolvedValue(mockPricing);
      repo.findSlotWithPowerBankInTx.mockResolvedValue({
        ...mockSlotWithPowerBank,
        stationId: 'other-station',
      });
      repo.$transaction.mockImplementation(async (fn) => fn({} as never));

      await expect(
        service.start({
          userId: 'user-uuid-1',
          stationId: 'station-uuid-1',
          slotId: 'slot-uuid-1',
        }),
      ).rejects.toThrow(SlotNotFoundException);
    });

    it('throws SlotEmptyException when slot has no power bank', async () => {
      repo.findActiveByUser.mockResolvedValue(null);
      repo.getDefaultPricing.mockResolvedValue(mockPricing);
      repo.findSlotWithPowerBankInTx.mockResolvedValue({
        ...mockSlotWithPowerBank,
        powerBank: null,
      });
      repo.$transaction.mockImplementation(async (fn) => fn({} as never));

      await expect(
        service.start({
          userId: 'user-uuid-1',
          stationId: 'station-uuid-1',
          slotId: 'slot-uuid-1',
        }),
      ).rejects.toThrow(SlotEmptyException);
    });

    it('throws PowerBankNotIdleException when power bank is rented', async () => {
      repo.findActiveByUser.mockResolvedValue(null);
      repo.getDefaultPricing.mockResolvedValue(mockPricing);
      repo.findSlotWithPowerBankInTx.mockResolvedValue({
        ...mockSlotWithPowerBank,
        powerBank: { ...mockSlotWithPowerBank.powerBank, status: 'rented' },
      });
      repo.$transaction.mockImplementation(async (fn) => fn({} as never));

      await expect(
        service.start({
          userId: 'user-uuid-1',
          stationId: 'station-uuid-1',
          slotId: 'slot-uuid-1',
        }),
      ).rejects.toThrow(PowerBankNotIdleException);
    });

    it('releases lock on error', async () => {
      repo.findActiveByUser.mockResolvedValue(null);
      repo.getDefaultPricing.mockResolvedValue(mockPricing);
      repo.findSlotWithPowerBankInTx.mockResolvedValue(null);
      repo.$transaction.mockImplementation(async (fn) => fn({} as never));

      await expect(
        service.start({ userId: 'user-uuid-1', stationId: 'st', slotId: 'sl' }),
      ).rejects.toThrow();

      expect(mockRelease).toHaveBeenCalled();
    });

    it('propagates cabinet readiness errors before freezing wallet', async () => {
      repo.findActiveByUser.mockResolvedValue(null);
      repo.getDefaultPricing.mockResolvedValue(mockPricing);
      cabinetCommands.requireOnlineCabinet.mockRejectedValue(
        new Error('cabinet offline'),
      );

      await expect(
        service.start({
          userId: 'user-uuid-1',
          stationId: 'station-uuid-1',
          slotId: 'slot-uuid-1',
        }),
      ).rejects.toThrow('cabinet offline');

      expect(walletService.applyInExistingTx).not.toHaveBeenCalled();
      expect(mockRelease).toHaveBeenCalled();
    });

    it('unfreezes deposit when cabinet release command fails', async () => {
      repo.findActiveByUser.mockResolvedValue(null);
      repo.getDefaultPricing.mockResolvedValue(mockPricing);
      repo.findSlotWithPowerBankInTx.mockResolvedValue(mockSlotWithPowerBank);
      repo.$transaction.mockImplementation(async (fn) =>
        fn(makeMockTx() as never),
      );
      walletService.applyInExistingTx.mockResolvedValue({} as never);
      cabinetCommands.releaseSlot.mockRejectedValue(new Error('ack timeout'));

      await expect(
        service.start({
          userId: 'user-uuid-1',
          stationId: 'station-uuid-1',
          slotId: 'slot-uuid-1',
        }),
      ).rejects.toThrow('ack timeout');

      expect(walletService.applyInExistingTx).toHaveBeenNthCalledWith(
        1,
        expect.anything(),
        expect.objectContaining({
          type: 'freeze',
          amount: 3000,
          referenceId: 'pb-uuid-1',
        }),
      );
      expect(walletService.applyInExistingTx).toHaveBeenNthCalledWith(
        2,
        expect.anything(),
        expect.objectContaining({
          type: 'unfreeze',
          amount: 3000,
          referenceId: 'pb-uuid-1',
        }),
      );
      expect(repo.createRental).not.toHaveBeenCalled();
    });
  });

  describe('startWithAutoSelect', () => {
    it('selects first rentable slot and starts rental', async () => {
      repo.findFirstRentableSlotByStation.mockResolvedValue(
        mockSlotWithPowerBank,
      );
      repo.findActiveByUser.mockResolvedValue(null);
      repo.getDefaultPricing.mockResolvedValue(mockPricing);
      repo.findSlotWithPowerBankInTx.mockResolvedValue(mockSlotWithPowerBank);
      const mockTx = makeMockTx();
      repo.$transaction.mockImplementation(async (fn) => fn(mockTx as never));
      walletService.applyInExistingTx.mockResolvedValue({} as never);
      repo.createRental.mockResolvedValue(mockRental);

      const result = await service.startWithAutoSelect(
        'user-uuid-1',
        'station-uuid-1',
      );

      expect(repo.findFirstRentableSlotByStation).toHaveBeenCalledWith(
        'station-uuid-1',
      );
      expect(result.id).toBe('rental-uuid-1');
    });

    it('throws SlotEmptyException when no rentable slot exists', async () => {
      repo.findFirstRentableSlotByStation.mockResolvedValue(null);

      await expect(
        service.startWithAutoSelect('user-uuid-1', 'station-uuid-1'),
      ).rejects.toThrow(SlotEmptyException);
    });
  });

  // ─── return ──────────────────────────────────────────────────────────────

  describe('return', () => {
    const mockEmptySlot = {
      id: 'return-slot-uuid-1',
      stationId: 'station-uuid-2',
      slotIndex: 1,
      status: 'empty' as const,
      powerBankId: null,
      updatedAt: new Date(),
    };

    it('completes rental and charges correct amount', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-04-22T10:00:00.000Z'));
      const rental = {
        ...mockRental,
        startedAt: new Date('2026-04-22T09:00:00.000Z'),
      };

      repo.findByIdAndUser.mockResolvedValue(rental);
      repo.findSlotById.mockResolvedValue(mockEmptySlot);
      repo.getDefaultPricing.mockResolvedValue(mockPricing);
      const mockTx = makeMockTx();
      repo.$transaction.mockImplementation(async (fn) => fn(mockTx as never));
      walletService.applyInExistingTx.mockResolvedValue({} as never);
      repo.completeRental.mockResolvedValue({
        ...rental,
        status: 'completed',
        chargeAmount: 500,
        endStationId: 'station-uuid-2',
        endSlotId: 'return-slot-uuid-1',
      });

      const result = await service.return({
        rentalId: 'rental-uuid-1',
        userId: 'user-uuid-1',
        stationId: 'station-uuid-2',
        slotId: 'return-slot-uuid-1',
      });

      expect(result.status).toBe('completed');
      expect(result.chargeAmount).toBe(500);
      expect(cabinetCommands.requireOnlineCabinet).toHaveBeenCalledWith(
        'station-uuid-2',
      );
      expect(cabinetCommands.lockSlot).toHaveBeenCalledWith('cabinet-uuid-1', {
        slotId: 'return-slot-uuid-1',
        slotIndex: 1,
      });
      expect(walletService.applyInExistingTx).toHaveBeenNthCalledWith(
        1,
        mockTx,
        expect.objectContaining({
          type: 'unfreeze',
          amount: 3000,
        }),
      );
      expect(walletService.applyInExistingTx).toHaveBeenNthCalledWith(
        2,
        mockTx,
        expect.objectContaining({
          type: 'charge',
          amount: 500,
        }),
      );

      jest.useRealTimers();
    });

    it('throws RentalNotFoundException when not found', async () => {
      repo.findByIdAndUser.mockResolvedValue(null);

      await expect(
        service.return({
          rentalId: 'x',
          userId: 'u',
          stationId: 'st',
          slotId: 'sl',
        }),
      ).rejects.toThrow(RentalNotFoundException);
    });

    it('throws ForbiddenException when rental not active', async () => {
      repo.findByIdAndUser.mockResolvedValue({
        ...mockRental,
        status: 'completed',
      });

      await expect(
        service.return({
          rentalId: 'rental-uuid-1',
          userId: 'user-uuid-1',
          stationId: 'st',
          slotId: 'sl',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws SlotOccupiedException when return slot is occupied', async () => {
      repo.findByIdAndUser.mockResolvedValue(mockRental);
      repo.findSlotById.mockResolvedValue({
        ...mockEmptySlot,
        status: 'occupied',
      });
      repo.getDefaultPricing.mockResolvedValue(mockPricing);

      await expect(
        service.return({
          rentalId: 'rental-uuid-1',
          userId: 'user-uuid-1',
          stationId: 'station-uuid-2',
          slotId: 'return-slot-uuid-1',
        }),
      ).rejects.toThrow(SlotOccupiedException);
    });
  });

  describe('returnWithAutoSelect', () => {
    it('selects first empty slot and returns rental', async () => {
      const emptySlot = {
        id: 'return-slot-uuid-1',
        stationId: 'station-uuid-2',
        slotIndex: 1,
        status: 'empty' as const,
        powerBankId: null,
        updatedAt: new Date(),
      };
      repo.findFirstEmptySlotByStation.mockResolvedValue(emptySlot);
      repo.findByIdAndUser.mockResolvedValue(mockRental);
      repo.findSlotById.mockResolvedValue(emptySlot);
      repo.getDefaultPricing.mockResolvedValue(mockPricing);
      const mockTx = makeMockTx();
      repo.$transaction.mockImplementation(async (fn) => fn(mockTx as never));
      walletService.applyInExistingTx.mockResolvedValue({} as never);
      repo.completeRental.mockResolvedValue({
        ...mockRental,
        status: 'completed',
        endStationId: 'station-uuid-2',
        endSlotId: 'return-slot-uuid-1',
      });

      const result = await service.returnWithAutoSelect(
        'rental-uuid-1',
        'user-uuid-1',
        'station-uuid-2',
      );

      expect(repo.findFirstEmptySlotByStation).toHaveBeenCalledWith(
        'station-uuid-2',
      );
      expect(result.status).toBe('completed');
    });

    it('throws SlotOccupiedException when no empty slot exists', async () => {
      repo.findFirstEmptySlotByStation.mockResolvedValue(null);

      await expect(
        service.returnWithAutoSelect(
          'rental-uuid-1',
          'user-uuid-1',
          'station-uuid-2',
        ),
      ).rejects.toThrow(SlotOccupiedException);
    });
  });

  describe('getReturnStations', () => {
    it('returns nearby return-capable stations for active rental', async () => {
      repo.findByIdAndUser.mockResolvedValue(mockRental);
      repo.findNearbyReturnStations.mockResolvedValue([
        {
          id: 'station-uuid-2',
          name: 'Shangri-La Mall',
          address: 'Olympic street 19A',
          status: 'active',
          mqttDeviceId: 'cabinet-001',
          lastHeartbeatAt: new Date(),
          lat: 47.9136,
          lng: 106.9155,
          distanceMeters: 120,
          emptySlots: 2,
        },
      ]);

      const result = await service.getReturnStations(
        'rental-uuid-1',
        'user-uuid-1',
        {
          lat: 47.91,
          lng: 106.91,
          radiusKm: 5,
          limit: 10,
        },
      );

      expect(result).toHaveLength(1);
      expect(result[0]?.supportsReturn).toBe(true);
    });
  });

  // ─── calculateCost ───────────────────────────────────────────────────────

  describe('calculateCost', () => {
    it('charges per hour rate for 1 hour', () => {
      const start = new Date('2026-01-01T10:00:00Z');
      const end = new Date('2026-01-01T11:00:00Z');
      const result = service.calculateCost(start, end, {
        ratePerHour: 500,
        dailyMax: 5000,
      });

      expect(result.durationMinutes).toBe(60);
      expect(result.chargeAmount).toBe(500);
    });

    it('caps charge at dailyMax', () => {
      const start = new Date('2026-01-01T10:00:00Z');
      const end = new Date('2026-01-02T10:00:00Z'); // 24h
      const result = service.calculateCost(start, end, {
        ratePerHour: 500,
        dailyMax: 5000,
      });

      expect(result.chargeAmount).toBe(5000);
    });

    it('rounds up partial hours', () => {
      const start = new Date('2026-01-01T10:00:00Z');
      const end = new Date('2026-01-01T10:30:00Z'); // 30 min
      const result = service.calculateCost(start, end, {
        ratePerHour: 500,
        dailyMax: 5000,
      });

      expect(result.chargeAmount).toBe(250);
    });

    it('charges nothing for 0 seconds (returns 0)', () => {
      const now = new Date();
      const result = service.calculateCost(now, now, {
        ratePerHour: 500,
        dailyMax: 5000,
      });

      expect(result.chargeAmount).toBe(0);
    });
  });
});
