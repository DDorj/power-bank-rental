import { jest } from '@jest/globals';
import type { ConfigService } from '@nestjs/config';

jest.mock('../../../common/prisma/prisma.service', () => ({
  PrismaService: jest.fn(),
}));

import { CabinetCommandService } from '../cabinet-command.service.js';
import { CabinetAckTimeoutException } from '../iot.errors.js';
import type { EnvConfig } from '../../../config/env.schema.js';

type MockConfig = {
  get: jest.Mock;
};

type MockRepo = {
  findStationCabinetByStationId: jest.Mock;
  touchHeartbeat: jest.Mock;
  syncSlotStatus: jest.Mock;
};

type MockClient = {
  on: jest.Mock;
  publish: jest.Mock;
  subscribe: jest.Mock;
  end: jest.Mock;
};

function createService(overrides?: Partial<Record<string, unknown>>) {
  const values: Record<string, unknown> = {
    MQTT_URL: 'mqtt://broker',
    MQTT_ACK_TIMEOUT_MS: 10,
    MQTT_HEARTBEAT_TIMEOUT_MS: 90_000,
    ...overrides,
  };

  const config: MockConfig = {
    get: jest.fn((key: string) => values[key]),
  };
  const repo: MockRepo = {
    findStationCabinetByStationId: jest.fn(),
    touchHeartbeat: jest.fn().mockResolvedValue({ count: 1 }),
    syncSlotStatus: jest.fn().mockResolvedValue({ count: 1 }),
  };

  const service = new CabinetCommandService(
    config as unknown as ConfigService<EnvConfig, true>,
    repo as never,
  );

  return { service, config, repo, values };
}

function setReadyClient(service: CabinetCommandService, client: MockClient): void {
  const internal = service as never as {
    ready: boolean;
    client: MockClient;
  };
  internal.ready = true;
  internal.client = client;
}

describe('CabinetCommandService', () => {
  beforeEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('returns active cabinet id when heartbeat is fresh', async () => {
    const { service, repo } = createService();

    setReadyClient(service, {
      on: jest.fn(),
      publish: jest.fn(),
      subscribe: jest.fn(),
      end: jest.fn(),
    });
    repo.findStationCabinetByStationId.mockResolvedValue({
      id: 'station-uuid-1',
      mqttDeviceId: 'cabinet-uuid-1',
      lastHeartbeatAt: null,
    });
    (service as never as { heartbeats: Map<string, number> }).heartbeats.set(
      'cabinet-uuid-1',
      Date.now(),
    );

    await expect(service.requireOnlineCabinet('station-uuid-1')).resolves.toBe(
      'cabinet-uuid-1',
    );
  });

  it('publishes release command and resolves when ack arrives', async () => {
    const { service } = createService();
    const client = {
      on: jest.fn(),
      publish: jest.fn(
        (
          _topic: string,
          _payload: string,
          _options: { qos: number },
          callback: (error?: Error | null) => void,
        ) => callback(null),
      ),
      subscribe: jest.fn(),
      end: jest.fn(),
    };

    setReadyClient(service, client);

    const promise = service.releaseSlot('cabinet-uuid-1', {
      slotId: 'slot-uuid-1',
      slotIndex: 0,
    });

    expect(client.publish).toHaveBeenCalledWith(
      'cabinets/cabinet-uuid-1/cmd/release',
      expect.any(String),
      { qos: 1 },
      expect.any(Function),
    );

    const payload = JSON.parse(
      client.publish.mock.calls[0]![1] as string,
    ) as { commandId: string; slotId: string; slotIndex: number };

    expect(payload.slotId).toBe('slot-uuid-1');
    expect(payload.slotIndex).toBe(0);

    service.handleIncomingMessage(
      `cabinets/cabinet-uuid-1/ack/${payload.commandId}`,
      Buffer.from(
        JSON.stringify({
          status: 'ok',
          receivedAt: '2026-04-22T00:00:00.000Z',
        }),
      ),
    );

    await expect(promise).resolves.toMatchObject({
      commandId: payload.commandId,
      status: 'ok',
    });
  });

  it('rejects command when ack does not arrive before timeout', async () => {
    jest.useFakeTimers();
    const { service } = createService({ MQTT_ACK_TIMEOUT_MS: 25 });
    const client = {
      on: jest.fn(),
      publish: jest.fn(
        (
          _topic: string,
          _payload: string,
          _options: { qos: number },
          callback: (error?: Error | null) => void,
        ) => callback(null),
      ),
      subscribe: jest.fn(),
      end: jest.fn(),
    };

    setReadyClient(service, client);

    const promise = service
      .lockSlot('cabinet-uuid-1', {
        slotId: 'slot-uuid-1',
        slotIndex: 0,
      })
      .catch((error: unknown) => error);

    await jest.advanceTimersByTimeAsync(30);

    await expect(promise).resolves.toBeInstanceOf(CabinetAckTimeoutException);
  });

  it('stores heartbeat in memory and repository', async () => {
    const { service, repo } = createService();
    const seenAt = '2026-04-22T00:00:00.000Z';

    service.handleIncomingMessage(
      'cabinets/cabinet-uuid-1/heartbeat',
      Buffer.from(JSON.stringify({ seenAt })),
    );

    await new Promise((resolve) => setImmediate(resolve));

    expect(repo.touchHeartbeat).toHaveBeenCalledWith(
      'cabinet-uuid-1',
      new Date(seenAt),
    );
    expect(
      (service as never as { heartbeats: Map<string, number> }).heartbeats.get(
        'cabinet-uuid-1',
      ),
    ).toBe(new Date(seenAt).getTime());
  });

  it('syncs slot snapshots from cabinet messages', async () => {
    const { service, repo } = createService();

    service.handleIncomingMessage(
      'cabinets/cabinet-uuid-1/slot/3',
      Buffer.from(
        JSON.stringify({
          status: 'occupied',
          seenAt: '2026-04-22T00:00:00.000Z',
        }),
      ),
    );

    await new Promise((resolve) => setImmediate(resolve));

    expect(repo.touchHeartbeat).toHaveBeenCalledWith(
      'cabinet-uuid-1',
      new Date('2026-04-22T00:00:00.000Z'),
    );
    expect(repo.syncSlotStatus).toHaveBeenCalledWith(
      'cabinet-uuid-1',
      3,
      'occupied',
    );
  });

  it('reports degraded health when mqtt package is unavailable', async () => {
    const { service } = createService();
    const serviceWithInternals = service as never as {
      loadMqttModule: () => Promise<unknown>;
    };

    jest
      .spyOn(serviceWithInternals, 'loadMqttModule')
      .mockResolvedValue(null);

    await service.onModuleInit();

    expect(service.getHealthStatus()).toEqual({
      status: 'error',
      error: 'mqtt package unavailable',
    });
  });
});
