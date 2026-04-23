import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { RentalsService } from '../../rentals/rentals.service.js';
import { StationsService } from '../../stations/stations.service.js';
import { WalletService } from '../../wallet/wallet.service.js';
import { AppScanService } from '../app-scan.service.js';

describe('AppScanService', () => {
  let service: AppScanService;
  let stationsService: jest.Mocked<StationsService>;
  let walletService: jest.Mocked<WalletService>;
  let rentalsService: jest.Mocked<RentalsService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AppScanService,
        {
          provide: StationsService,
          useValue: {
            findById: jest.fn(),
            findByMqttDeviceId: jest.fn(),
          },
        },
        {
          provide: WalletService,
          useValue: {
            getOrCreate: jest.fn(),
          },
        },
        {
          provide: RentalsService,
          useValue: {
            previewStart: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(AppScanService);
    stationsService = module.get(StationsService);
    walletService = module.get(WalletService);
    rentalsService = module.get(RentalsService);
  });

  it('resolves qr data from json payload with slot context', async () => {
    stationsService.findById.mockResolvedValue({
      id: 'station-1',
      name: 'Shangri-La Mall',
      address: 'Olympic street 19A',
      status: 'active',
      totalSlots: 8,
      mqttDeviceId: 'cabinet-demo-1',
      lastHeartbeatAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      lat: 47.9136,
      lng: 106.9155,
      availableSlots: 1,
      occupiedSlots: 1,
      online: true,
      supportsReturn: true,
      inventorySummary: {
        totalPowerBanks: 1,
        availableCount: 1,
        chargingCount: 0,
        rentedCount: 0,
        faultyCount: 0,
      },
      slots: [
        {
          id: 'slot-1',
          stationId: 'station-1',
          slotIndex: 0,
          status: 'occupied',
          powerBankId: 'pb-1',
          updatedAt: new Date(),
          powerBank: {
            id: 'pb-1',
            serialNumber: 'PB-DEMO-001',
            status: 'idle',
            chargeLevel: 80,
            stationId: 'station-1',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ],
    });
    walletService.getOrCreate.mockResolvedValue({
      id: 'wallet-1',
      userId: 'user-1',
      balance: 15000,
      frozenAmount: 3000,
      availableBalance: 12000,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.resolveQr(
      'user-1',
      JSON.stringify({ stationId: 'station-1', slotId: 'slot-1' }),
    );

    expect(result.canStartRental).toBe(true);
    expect(result.detectedSlot?.id).toBe('slot-1');
    expect(stationsService.findById).toHaveBeenCalledWith('station-1');
  });

  it('resolves qr data from mqtt device id url', async () => {
    stationsService.findByMqttDeviceId.mockResolvedValue({
      id: 'station-1',
      name: 'Shangri-La Mall',
      address: 'Olympic street 19A',
      status: 'active',
      totalSlots: 8,
      mqttDeviceId: 'cabinet-demo-1',
      lastHeartbeatAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      lat: 47.9136,
      lng: 106.9155,
      availableSlots: 0,
      occupiedSlots: 1,
      online: false,
      supportsReturn: true,
      inventorySummary: {
        totalPowerBanks: 1,
        availableCount: 0,
        chargingCount: 1,
        rentedCount: 0,
        faultyCount: 0,
      },
      slots: [],
    });
    walletService.getOrCreate.mockResolvedValue({
      id: 'wallet-1',
      userId: 'user-1',
      balance: 15000,
      frozenAmount: 0,
      availableBalance: 15000,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.resolveQr(
      'user-1',
      'https://app.example.mn/scan?mqttDeviceId=cabinet-demo-1',
    );

    expect(result.reason).toBe('station_offline');
    expect(stationsService.findByMqttDeviceId).toHaveBeenCalledWith(
      'cabinet-demo-1',
    );
  });

  it('delegates rental preview to rentals service', async () => {
    rentalsService.previewStart.mockResolvedValue({
      stationId: 'station-1',
      slotId: 'slot-1',
      slotIndex: 0,
      powerBankId: 'pb-1',
      powerBankSerialNumber: 'PB-DEMO-001',
      powerBankChargeLevel: 80,
      depositAmount: 3000,
      ratePerHour: 500,
      dailyMax: 5000,
      walletAvailableBalance: 12000,
      sufficientBalance: true,
      hasActiveRental: false,
      canStartRental: true,
    });

    const result = await service.previewRental('user-1', 'station-1', 'slot-1');

    expect(rentalsService.previewStart).toHaveBeenCalledWith(
      'user-1',
      'station-1',
      'slot-1',
    );
    expect(result.canStartRental).toBe(true);
  });
});
