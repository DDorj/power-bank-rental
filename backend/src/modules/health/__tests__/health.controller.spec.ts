import { jest } from '@jest/globals';
import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

// Prevent importing generated Prisma client (uses import.meta which fails in Jest CJS mode)
jest.mock('../../../common/prisma/prisma.service', () => ({
  PrismaService: jest.fn(),
}));
jest.mock('../../../common/redis/redis.service', () => ({
  RedisService: jest.fn(),
}));

import { HealthController } from '../health.controller.js';
import { PrismaService } from '../../../common/prisma/prisma.service.js';
import { RedisService } from '../../../common/redis/redis.service.js';
import { CabinetCommandService } from '../../iot/cabinet-command.service.js';

const mockPrisma = {
  $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
};

const mockRedis = {
  ping: jest.fn().mockResolvedValue('PONG'),
};

const mockMqtt = {
  getHealthStatus: jest.fn().mockReturnValue({ status: 'ok' }),
};

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: CabinetCommandService, useValue: mockMqtt },
      ],
    }).compile();
    controller = module.get(HealthController);
    jest.clearAllMocks();
    mockMqtt.getHealthStatus.mockReturnValue({ status: 'ok' });
  });

  describe('liveness (GET /health)', () => {
    it('returns ok status with uptime and timestamp', () => {
      const result = controller.liveness();
      expect(result.status).toBe('ok');
      expect(typeof result.uptime).toBe('number');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
    });
  });

  describe('readiness (GET /health/ready)', () => {
    it('returns ok when DB, Redis, and MQTT respond', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockRedis.ping.mockResolvedValue('PONG');
      mockMqtt.getHealthStatus.mockReturnValue({ status: 'ok' });

      const result = await controller.readiness();
      expect(result.status).toBe('ok');
      expect(result.components.database.status).toBe('ok');
      expect(result.components.redis.status).toBe('ok');
      expect(result.components.mqtt.status).toBe('ok');
    });

    it('throws ServiceUnavailableException when DB fails', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('connection refused'));
      mockRedis.ping.mockResolvedValue('PONG');

      await expect(controller.readiness()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('throws ServiceUnavailableException when Redis fails', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockRedis.ping.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(controller.readiness()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });

    it('throws ServiceUnavailableException when MQTT fails', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockRedis.ping.mockResolvedValue('PONG');
      mockMqtt.getHealthStatus.mockReturnValue({
        status: 'error',
        error: 'mqtt broker unavailable',
      });

      await expect(controller.readiness()).rejects.toMatchObject({
        response: {
          status: 'degraded',
          components: {
            database: { status: 'ok' },
            redis: { status: 'ok' },
            mqtt: { status: 'error', error: 'mqtt broker unavailable' },
          },
        },
      });
    });

    it('returns sanitized error (not internal message) in component status on DB failure', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('DB is down'));
      mockRedis.ping.mockResolvedValue('PONG');
      mockMqtt.getHealthStatus.mockReturnValue({ status: 'ok' });

      await expect(controller.readiness()).rejects.toMatchObject({
        response: {
          status: 'degraded',
          components: {
            database: { status: 'error', error: 'database unreachable' },
            redis: { status: 'ok' },
            mqtt: { status: 'ok' },
          },
        },
      });
    });
  });
});
