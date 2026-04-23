import type {
  StationStatus,
  SlotStatus,
  PowerBankStatus,
} from '../../../generated/prisma/enums.js';

export interface StationRecord {
  id: string;
  name: string;
  address: string;
  status: StationStatus;
  totalSlots: number;
  mqttDeviceId: string | null;
  lastHeartbeatAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StationWithLocation extends StationRecord {
  lat: number;
  lng: number;
}

export interface StationNearbyRow extends StationWithLocation {
  distanceMeters: number;
  availableSlots: number;
}

export interface SlotRecord {
  id: string;
  stationId: string;
  slotIndex: number;
  status: SlotStatus;
  powerBankId: string | null;
  updatedAt: Date;
}

export interface PowerBankRecord {
  id: string;
  serialNumber: string;
  status: PowerBankStatus;
  chargeLevel: number;
  stationId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StationDetail extends StationWithLocation {
  availableSlots: number;
  occupiedSlots: number;
  online: boolean;
  supportsReturn: boolean;
  inventorySummary: {
    totalPowerBanks: number;
    availableCount: number;
    chargingCount: number;
    rentedCount: number;
    faultyCount: number;
  };
  slots: Array<SlotRecord & { powerBank: PowerBankRecord | null }>;
}

export interface AdminStationListRow extends StationWithLocation {
  availableSlots: number;
  occupiedSlots: number;
  online: boolean;
}

export interface CreateStationParams {
  name: string;
  address: string;
  lat: number;
  lng: number;
  totalSlots: number;
  mqttDeviceId?: string;
}

export interface UpdateStationParams {
  name?: string;
  address?: string;
  lat?: number;
  lng?: number;
  status?: StationStatus;
  mqttDeviceId?: string;
}

export interface NearbyParams {
  lat: number;
  lng: number;
  radiusKm: number;
  limit: number;
}
