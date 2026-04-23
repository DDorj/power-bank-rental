import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

jest.mock('../../../common/prisma/prisma.service', () => ({
  PrismaService: jest.fn(),
}));

import { StationsService } from '../stations.service.js';
import { StationsRepository } from '../stations.repository.js';
import type {
  StationNearbyRow,
  StationDetail,
  AdminStationListRow,
} from '../stations.types.js';

const mockNearby: StationNearbyRow[] = [
  {
    id: 'station-uuid-1',
    name: 'Сүхбаатарын талбай',
    address: 'Сүхбаатарын талбай, UB',
    status: 'active',
    totalSlots: 10,
    mqttDeviceId: 'cabinet-001',
    lastHeartbeatAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    lat: 47.9184,
    lng: 106.9175,
    distanceMeters: 120,
    availableSlots: 4,
  },
];

const mockDetail: StationDetail = {
  ...mockNearby[0]!,
  occupiedSlots: 0,
  online: false,
  supportsReturn: true,
  inventorySummary: {
    totalPowerBanks: 0,
    availableCount: 0,
    chargingCount: 0,
    rentedCount: 0,
    faultyCount: 0,
  },
  slots: [
    {
      id: 'slot-uuid-1',
      stationId: 'station-uuid-1',
      slotIndex: 0,
      status: 'empty',
      powerBankId: null,
      updatedAt: new Date(),
      powerBank: null,
    },
  ],
};

const mockAdminList: Omit<AdminStationListRow, 'online'>[] = [
  {
    id: 'station-uuid-1',
    name: 'Сүхбаатарын талбай',
    address: 'Сүхбаатарын талбай, UB',
    status: 'active',
    totalSlots: 10,
    mqttDeviceId: 'cabinet-001',
    lastHeartbeatAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    lat: 47.9184,
    lng: 106.9175,
    availableSlots: 4,
    occupiedSlots: 3,
  },
];

describe('StationsService', () => {
  let service: StationsService;
  let repo: jest.Mocked<StationsRepository>;
  let config: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StationsService,
        {
          provide: StationsRepository,
          useValue: {
            findNearby: jest.fn(),
            findById: jest.fn(),
            findByMqttDeviceId: jest.fn(),
            findAdminList: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            existsById: jest.fn(),
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

    service = module.get(StationsService);
    repo = module.get(StationsRepository);
    config = module.get(ConfigService);
  });

  describe('findNearby', () => {
    it('returns nearby stations', async () => {
      repo.findNearby.mockResolvedValue(mockNearby);

      const result = await service.findNearby({
        lat: 47.9184,
        lng: 106.9175,
        radiusKm: 5,
        limit: 20,
      });

      expect(result).toHaveLength(1);
      expect(result[0]!.distanceMeters).toBe(120);
      expect(repo.findNearby).toHaveBeenCalledWith({
        lat: 47.9184,
        lng: 106.9175,
        radiusKm: 5,
        limit: 20,
      });
    });

    it('returns empty array when no stations nearby', async () => {
      repo.findNearby.mockResolvedValue([]);

      const result = await service.findNearby({
        lat: 0,
        lng: 0,
        radiusKm: 1,
        limit: 20,
      });

      expect(result).toHaveLength(0);
    });

    it('filters out offline and unconfigured cabinets when MQTT is enabled', async () => {
      repo.findNearby.mockResolvedValue([
        mockNearby[0]!,
        {
          ...mockNearby[0]!,
          id: 'station-uuid-2',
          mqttDeviceId: 'cabinet-002',
          lastHeartbeatAt: new Date(Date.now() - 180_000),
        },
        {
          ...mockNearby[0]!,
          id: 'station-uuid-3',
          mqttDeviceId: null,
          lastHeartbeatAt: null,
        },
      ]);

      const result = await service.findNearby({
        lat: 47.9184,
        lng: 106.9175,
        radiusKm: 5,
        limit: 20,
      });

      expect(result.map((station) => station.id)).toEqual(['station-uuid-1']);
    });

    it('keeps all stations when MQTT filtering is disabled', async () => {
      config.get.mockImplementation((key: string) => {
        if (key === 'MQTT_URL') return undefined;
        if (key === 'MQTT_HEARTBEAT_TIMEOUT_MS') return 90_000;
        return undefined;
      });
      repo.findNearby.mockResolvedValue([
        mockNearby[0]!,
        {
          ...mockNearby[0]!,
          id: 'station-uuid-2',
          mqttDeviceId: null,
          lastHeartbeatAt: null,
        },
      ]);

      const result = await service.findNearby({
        lat: 47.9184,
        lng: 106.9175,
        radiusKm: 5,
        limit: 20,
      });

      expect(result).toHaveLength(2);
    });
  });

  describe('findById', () => {
    it('returns station detail', async () => {
      repo.findById.mockResolvedValue(mockDetail);

      const result = await service.findById('station-uuid-1');

      expect(result.id).toBe('station-uuid-1');
      expect(result.slots).toHaveLength(1);
      expect(result.online).toBe(true);
    });

    it('throws NotFoundException when station not found', async () => {
      repo.findById.mockResolvedValue(null);

      await expect(service.findById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByMqttDeviceId', () => {
    it('returns station detail for mqtt device id', async () => {
      repo.findByMqttDeviceId.mockResolvedValue(mockDetail);

      const result = await service.findByMqttDeviceId('cabinet-001');

      expect(result.id).toBe('station-uuid-1');
      expect(repo.findByMqttDeviceId).toHaveBeenCalledWith('cabinet-001');
    });
  });

  describe('findAdminList', () => {
    it('marks stations online based on recent heartbeat', async () => {
      repo.findAdminList.mockResolvedValue([
        mockAdminList[0]!,
        {
          ...mockAdminList[0]!,
          id: 'station-uuid-2',
          mqttDeviceId: 'cabinet-002',
          lastHeartbeatAt: new Date(Date.now() - 180_000),
        },
        {
          ...mockAdminList[0]!,
          id: 'station-uuid-3',
          mqttDeviceId: null,
          lastHeartbeatAt: null,
        },
      ]);

      const result = await service.findAdminList();

      expect(result).toEqual([
        expect.objectContaining({ id: 'station-uuid-1', online: true }),
        expect.objectContaining({ id: 'station-uuid-2', online: false }),
        expect.objectContaining({ id: 'station-uuid-3', online: false }),
      ]);
    });
  });

  describe('create', () => {
    it('creates station and returns it', async () => {
      repo.create.mockResolvedValue(mockDetail);

      const result = await service.create({
        name: 'Сүхбаатарын талбай',
        address: 'UB, Mongolia',
        lat: 47.9184,
        lng: 106.9175,
        totalSlots: 10,
      });

      expect(result.id).toBe('station-uuid-1');
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ lat: 47.9184, lng: 106.9175 }),
      );
    });
  });

  describe('update', () => {
    it('updates station when it exists', async () => {
      repo.existsById.mockResolvedValue(true);
      repo.update.mockResolvedValue(mockDetail);

      const result = await service.update('station-uuid-1', {
        name: 'New Name',
      });

      expect(result.id).toBe('station-uuid-1');
      expect(repo.update).toHaveBeenCalledWith('station-uuid-1', {
        name: 'New Name',
      });
    });

    it('throws NotFoundException when station not found', async () => {
      repo.existsById.mockResolvedValue(false);

      await expect(
        service.update('non-existent', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('soft-deletes station when it exists', async () => {
      repo.existsById.mockResolvedValue(true);
      repo.softDelete.mockResolvedValue(undefined);

      await service.remove('station-uuid-1');

      expect(repo.softDelete).toHaveBeenCalledWith('station-uuid-1');
    });

    it('throws NotFoundException when station not found', async () => {
      repo.existsById.mockResolvedValue(false);

      await expect(service.remove('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
