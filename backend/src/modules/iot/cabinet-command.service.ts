import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import type { SlotStatus } from '../../../generated/prisma/enums.js';
import type { EnvConfig } from '../../config/env.schema.js';
import {
  buildCabinetCommandTopic,
  parseCabinetAckTopic,
  parseCabinetHeartbeatTopic,
  parseCabinetSlotTopic,
  parseCabinetStatusTopic,
} from './cabinet-topics.js';
import type { CabinetCommandType } from './cabinet-topics.js';
import type {
  CabinetCommandAck,
  CabinetSlotCommandTarget,
  MqttHealthStatus,
} from './iot.types.js';
import { IotRepository } from './iot.repository.js';
import {
  CabinetAckTimeoutException,
  CabinetCommandFailedException,
  CabinetNotConfiguredException,
  CabinetOfflineException,
  MqttNotConfiguredException,
  MqttUnavailableException,
} from './iot.errors.js';

const DEFAULT_ACK_TIMEOUT_MS = 60_000;
const DEFAULT_HEARTBEAT_TIMEOUT_MS = 90_000;
const BASE_TOPICS = [
  'cabinets/+/status',
  'cabinets/+/slot/+',
  'cabinets/+/heartbeat',
  'cabinets/+/ack/+',
] as const;

type PendingAck = {
  resolve: (ack: CabinetCommandAck) => void;
  reject: (error: Error) => void;
  timer: NodeJS.Timeout;
};

type DynamicMqttClient = {
  on(event: string, handler: (...args: unknown[]) => void): void;
  publish(
    topic: string,
    payload: string,
    options: { qos: number },
    callback: (error?: Error | null) => void,
  ): void;
  subscribe(
    topics: readonly string[],
    options: { qos: number },
    callback: (error?: Error | null) => void,
  ): void;
  end(force?: boolean, callback?: () => void): void;
};

type DynamicMqttModule = {
  connect?: (url: string) => DynamicMqttClient;
  default?: {
    connect?: (url: string) => DynamicMqttClient;
  };
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseDate(value: unknown): Date | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    return null;
  }

  return Number(trimmed);
}

function parseJsonPayload(payload: Buffer): Record<string, unknown> | null {
  try {
    const raw = JSON.parse(payload.toString('utf8')) as unknown;
    return isRecord(raw) ? raw : null;
  } catch {
    return null;
  }
}

function readSeenAt(parsed: Record<string, unknown> | null): Date {
  return (
    parseDate(parsed?.['seenAt']) ??
    parseDate(parsed?.['timestamp']) ??
    parseDate(parsed?.['sentAt']) ??
    parseDate(parsed?.['updatedAt']) ??
    new Date()
  );
}

function readBoolean(
  parsed: Record<string, unknown>,
  keys: string[],
): boolean | null {
  for (const key of keys) {
    const value = parsed[key];
    if (typeof value === 'boolean') {
      return value;
    }
  }

  return null;
}

function resolveSlotIndex(
  slotRef: string,
  parsed: Record<string, unknown> | null,
): number | null {
  return (
    parseInteger(slotRef) ??
    parseInteger(parsed?.['slotIndex']) ??
    parseInteger(parsed?.['slotId']) ??
    null
  );
}

function normalizeSlotStatus(
  parsed: Record<string, unknown> | null,
): SlotStatus | null {
  if (!parsed) {
    return null;
  }

  const rawStatus =
    typeof parsed['status'] === 'string'
      ? parsed['status'].trim().toLowerCase()
      : null;

  if (
    rawStatus &&
    ['faulty', 'error', 'jammed', 'broken', 'maintenance'].includes(rawStatus)
  ) {
    return 'faulty';
  }

  if (
    rawStatus &&
    [
      'occupied',
      'loaded',
      'present',
      'powerbank_present',
      'power_bank_present',
      'charging',
    ].includes(rawStatus)
  ) {
    return 'occupied';
  }

  if (
    rawStatus &&
    ['empty', 'vacant', 'available', 'released', 'missing'].includes(rawStatus)
  ) {
    return 'empty';
  }

  const faulty = readBoolean(parsed, ['faulty', 'isFaulty']);
  if (faulty === true) {
    return 'faulty';
  }

  const occupied = readBoolean(parsed, [
    'occupied',
    'powerBankPresent',
    'hasPowerBank',
    'present',
  ]);
  if (occupied !== null) {
    return occupied ? 'occupied' : 'empty';
  }

  return null;
}

@Injectable()
export class CabinetCommandService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CabinetCommandService.name);
  private readonly ackTimeoutMs: number;
  private readonly heartbeatTimeoutMs: number;
  private readonly heartbeats = new Map<string, number>();
  private readonly pendingAcks = new Map<string, PendingAck>();

  private client: DynamicMqttClient | null = null;
  private ready = false;
  private lastError: string | null = null;

  constructor(
    private readonly config: ConfigService<EnvConfig, true>,
    private readonly repo: IotRepository,
  ) {
    this.ackTimeoutMs =
      this.config.get('MQTT_ACK_TIMEOUT_MS', { infer: true }) ??
      DEFAULT_ACK_TIMEOUT_MS;
    this.heartbeatTimeoutMs =
      this.config.get('MQTT_HEARTBEAT_TIMEOUT_MS', { infer: true }) ??
      DEFAULT_HEARTBEAT_TIMEOUT_MS;
  }

  async onModuleInit(): Promise<void> {
    const mqttUrl = this.config.get('MQTT_URL', { infer: true });
    if (!mqttUrl) {
      this.lastError = 'mqtt url missing';
      this.logger.warn('MQTT_URL is not configured; cabinet flow stays degraded');
      return;
    }

    const mqttModule = await this.loadMqttModule();
    if (!mqttModule) {
      this.lastError = 'mqtt package unavailable';
      return;
    }

    const connect = mqttModule.connect ?? mqttModule.default?.connect ?? null;
    if (!connect) {
      this.lastError = 'mqtt connect function unavailable';
      this.logger.error('MQTT package loaded without connect()');
      return;
    }

    this.client = connect(mqttUrl);
    this.client.on('connect', () => {
      this.ready = true;
      this.lastError = null;
      this.logger.log('MQTT broker connected');
      void this.subscribeBaseTopics();
    });
    this.client.on('reconnect', () => {
      this.ready = false;
      this.logger.warn('MQTT broker reconnecting');
    });
    this.client.on('offline', () => {
      this.ready = false;
      this.lastError = 'broker offline';
      this.rejectAllPending(new MqttUnavailableException());
      this.logger.warn('MQTT broker offline');
    });
    this.client.on('close', () => {
      this.ready = false;
      this.lastError = 'broker connection closed';
      this.rejectAllPending(new MqttUnavailableException());
      this.logger.warn('MQTT broker connection closed');
    });
    this.client.on('error', (error) => {
      const message = error instanceof Error ? error.message : String(error);
      this.ready = false;
      this.lastError = message;
      this.rejectAllPending(new MqttUnavailableException(message));
      this.logger.error(`MQTT broker error: ${message}`);
    });
    this.client.on('message', (topic, payload) => {
      if (typeof topic !== 'string' || !Buffer.isBuffer(payload)) {
        return;
      }
      this.handleIncomingMessage(topic, payload);
    });
  }

  async onModuleDestroy(): Promise<void> {
    this.rejectAllPending(new MqttUnavailableException('mqtt shutdown'));

    if (!this.client) {
      return;
    }

    await new Promise<void>((resolve) => {
      this.client?.end(false, resolve);
    });
    this.client = null;
    this.ready = false;
  }

  getHealthStatus(): MqttHealthStatus {
    if (this.ready) {
      return { status: 'ok' };
    }

    return {
      status: 'error',
      error: this.lastError ?? 'mqtt broker unavailable',
    };
  }

  async requireOnlineCabinet(stationId: string): Promise<string> {
    const mqttUrl = this.config.get('MQTT_URL', { infer: true });
    if (!mqttUrl) {
      throw new MqttNotConfiguredException();
    }

    if (!this.ready || !this.client) {
      throw new MqttUnavailableException();
    }

    const station = await this.repo.findStationCabinetByStationId(stationId);
    if (!station?.mqttDeviceId) {
      throw new CabinetNotConfiguredException();
    }

    const lastSeenAt =
      this.heartbeats.get(station.mqttDeviceId) ??
      station.lastHeartbeatAt?.getTime() ??
      null;

    if (
      lastSeenAt === null ||
      Date.now() - lastSeenAt > this.heartbeatTimeoutMs
    ) {
      throw new CabinetOfflineException();
    }

    return station.mqttDeviceId;
  }

  releaseSlot(
    cabinetId: string,
    slot: CabinetSlotCommandTarget,
  ): Promise<CabinetCommandAck> {
    return this.sendCommand(cabinetId, 'release', slot);
  }

  lockSlot(
    cabinetId: string,
    slot: CabinetSlotCommandTarget,
  ): Promise<CabinetCommandAck> {
    return this.sendCommand(cabinetId, 'lock', slot);
  }

  handleIncomingMessage(topic: string, payload: Buffer): void {
    const ack = parseCabinetAckTopic(topic);
    if (ack) {
      this.handleAckMessage(ack.cabinetId, ack.commandId, payload);
      return;
    }

    const heartbeat = parseCabinetHeartbeatTopic(topic);
    if (heartbeat) {
      void this.handleHeartbeatMessage(heartbeat.cabinetId, payload);
      return;
    }

    const status = parseCabinetStatusTopic(topic);
    if (status) {
      void this.handleStatusMessage(status.cabinetId, payload);
      return;
    }

    const slot = parseCabinetSlotTopic(topic);
    if (slot) {
      void this.handleSlotMessage(slot.cabinetId, slot.slotRef, payload);
    }
  }

  private async loadMqttModule(): Promise<DynamicMqttModule | null> {
    try {
      return (await import('mqtt')) as DynamicMqttModule;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`MQTT package could not be loaded: ${message}`);
      return null;
    }
  }

  private subscribeBaseTopics(): Promise<void> {
    if (!this.client) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.client?.subscribe(BASE_TOPICS, { qos: 1 }, (error) => {
        if (error) {
          const message = error.message;
          this.lastError = message;
          this.ready = false;
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  private async sendCommand(
    cabinetId: string,
    command: CabinetCommandType,
    slot: CabinetSlotCommandTarget,
  ): Promise<CabinetCommandAck> {
    if (!this.ready || !this.client) {
      throw new MqttUnavailableException();
    }

    const commandId = randomUUID();
    const ackPromise = this.waitForAck(cabinetId, commandId);

    await new Promise<void>((resolve, reject) => {
      this.client?.publish(
        buildCabinetCommandTopic(cabinetId, command),
        JSON.stringify({
          commandId,
          slotId: slot.slotId,
          slotIndex: slot.slotIndex,
          issuedAt: new Date().toISOString(),
        }),
        { qos: 1 },
        (error) => {
          if (error) {
            this.pendingAcks.delete(this.pendingAckKey(cabinetId, commandId));
            reject(new MqttUnavailableException(error.message));
            return;
          }

          resolve();
        },
      );
    });

    return ackPromise;
  }

  private waitForAck(
    cabinetId: string,
    commandId: string,
  ): Promise<CabinetCommandAck> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingAcks.delete(this.pendingAckKey(cabinetId, commandId));
        reject(new CabinetAckTimeoutException());
      }, this.ackTimeoutMs);

      this.pendingAcks.set(this.pendingAckKey(cabinetId, commandId), {
        resolve,
        reject,
        timer,
      });
    });
  }

  private handleAckMessage(
    cabinetId: string,
    commandId: string,
    payload: Buffer,
  ): void {
    const key = this.pendingAckKey(cabinetId, commandId);
    const pending = this.pendingAcks.get(key);
    if (!pending) {
      return;
    }

    clearTimeout(pending.timer);
    this.pendingAcks.delete(key);

    try {
      const parsed = parseJsonPayload(payload) ?? {};
      const status =
        typeof parsed['status'] === 'string' &&
        parsed['status'].toLowerCase() === 'error'
          ? 'error'
          : 'ok';
      const ack: CabinetCommandAck = {
        commandId,
        status,
        errorCode:
          typeof parsed['errorCode'] === 'string' ? parsed['errorCode'] : null,
        errorMessage:
          typeof parsed['errorMessage'] === 'string'
            ? parsed['errorMessage']
            : typeof parsed['error'] === 'string'
              ? parsed['error']
              : null,
        receivedAt: parseDate(parsed['receivedAt']) ?? readSeenAt(parsed),
      };

      if (ack.status === 'error') {
        pending.reject(
          new CabinetCommandFailedException(ack.errorMessage ?? undefined),
        );
        return;
      }

      pending.resolve(ack);
    } catch {
      pending.reject(new CabinetCommandFailedException('invalid ack payload'));
    }
  }

  private async handleHeartbeatMessage(
    cabinetId: string,
    payload: Buffer,
  ): Promise<void> {
    const seenAt = readSeenAt(parseJsonPayload(payload));
    await this.recordCabinetSeen(cabinetId, seenAt);
  }

  private async handleStatusMessage(
    cabinetId: string,
    payload: Buffer,
  ): Promise<void> {
    const seenAt = readSeenAt(parseJsonPayload(payload));
    await this.recordCabinetSeen(cabinetId, seenAt);
  }

  private async handleSlotMessage(
    cabinetId: string,
    slotRef: string,
    payload: Buffer,
  ): Promise<void> {
    const parsed = parseJsonPayload(payload);
    const seenAt = readSeenAt(parsed);

    await this.recordCabinetSeen(cabinetId, seenAt);

    const slotIndex = resolveSlotIndex(slotRef, parsed);
    const status = normalizeSlotStatus(parsed);
    if (slotIndex === null || status === null) {
      this.logger.warn(
        `Skipping slot snapshot for ${cabinetId}/${slotRef}: unrecognized payload`,
      );
      return;
    }

    const updated = await this.repo.syncSlotStatus(cabinetId, slotIndex, status);
    if (updated.count === 0) {
      this.logger.warn(
        `No slot row matched MQTT snapshot ${cabinetId}/${slotIndex}`,
      );
    }
  }

  private async recordCabinetSeen(
    cabinetId: string,
    seenAt: Date,
  ): Promise<void> {
    this.heartbeats.set(cabinetId, seenAt.getTime());
    await this.repo.touchHeartbeat(cabinetId, seenAt);
  }

  private pendingAckKey(cabinetId: string, commandId: string): string {
    return `${cabinetId}:${commandId}`;
  }

  private rejectAllPending(error: Error): void {
    for (const pending of this.pendingAcks.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pendingAcks.clear();
  }
}
