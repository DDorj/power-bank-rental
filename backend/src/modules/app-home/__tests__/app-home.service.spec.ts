import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { RentalsService } from '../../rentals/rentals.service.js';
import { StationsService } from '../../stations/stations.service.js';
import { WalletService } from '../../wallet/wallet.service.js';
import { AppHomeService } from '../app-home.service.js';

describe('AppHomeService', () => {
  let service: AppHomeService;
  let walletService: jest.Mocked<WalletService>;
  let rentalsService: jest.Mocked<RentalsService>;
  let stationsService: jest.Mocked<StationsService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AppHomeService,
        {
          provide: WalletService,
          useValue: { getOrCreate: jest.fn() },
        },
        {
          provide: RentalsService,
          useValue: { getActive: jest.fn() },
        },
        {
          provide: StationsService,
          useValue: { findNearby: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(AppHomeService);
    walletService = module.get(WalletService);
    rentalsService = module.get(RentalsService);
    stationsService = module.get(StationsService);
  });

  it('returns wallet, active rental and nearby stations for home summary', async () => {
    walletService.getOrCreate.mockResolvedValue({
      id: 'wallet-1',
      userId: 'user-1',
      balance: 15000,
      frozenAmount: 3000,
      availableBalance: 12000,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    rentalsService.getActive.mockResolvedValue(null);
    stationsService.findNearby.mockResolvedValue([
      {
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
        distanceMeters: 100,
        availableSlots: 2,
      },
    ]);

    const result = await service.getSummary('user-1', {
      lat: 47.91,
      lng: 106.91,
      radiusKm: 3,
      limit: 5,
    });

    expect(walletService.getOrCreate).toHaveBeenCalledWith('user-1');
    expect(rentalsService.getActive).toHaveBeenCalledWith('user-1');
    expect(stationsService.findNearby).toHaveBeenCalledWith({
      lat: 47.91,
      lng: 106.91,
      radiusKm: 3,
      limit: 5,
    });
    expect(result.nearbyStations).toHaveLength(1);
  });
});
