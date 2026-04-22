import type { SlotStatus } from '../../../generated/prisma/enums.js';

export interface StationCabinetRecord {
  id: string;
  mqttDeviceId: string | null;
  lastHeartbeatAt: Date | null;
}

export interface CabinetSlotCommandTarget {
  slotId: string;
  slotIndex: number;
}

export interface CabinetCommandAck {
  commandId: string;
  status: 'ok' | 'error';
  errorCode: string | null;
  errorMessage: string | null;
  receivedAt: Date;
}

export interface MqttHealthStatus {
  status: 'ok' | 'error';
  error?: string;
}

export interface CabinetSlotSnapshot {
  cabinetId: string;
  slotIndex: number;
  status: SlotStatus;
  seenAt: Date;
}
