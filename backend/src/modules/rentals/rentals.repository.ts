import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type { PrismaClient } from '../../../generated/prisma/client.js';
import type {
  RentalRecord,
  PricingRuleRecord,
  ReturnStationOption,
} from './rentals.types.js';

type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

type RawReturnStationRow = {
  id: string;
  name: string;
  address: string;
  status: string;
  mqtt_device_id: string | null;
  last_heartbeat_at: Date | null;
  lat: number;
  lng: number;
  distance_meters: number;
  empty_slots: bigint;
};

export interface SlotRow {
  id: string;
  stationId: string;
  slotIndex: number;
  status: string;
  powerBankId: string | null;
  updatedAt: Date;
}

export interface SlotWithPowerBank extends SlotRow {
  powerBank: {
    id: string;
    serialNumber: string;
    status: string;
    chargeLevel: number;
    stationId: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
}

@Injectable()
export class RentalsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveByUser(userId: string): Promise<RentalRecord | null> {
    return this.prisma.rental.findFirst({
      where: { userId, status: 'active' },
    });
  }

  findByIdAndUser(id: string, userId: string): Promise<RentalRecord | null> {
    return this.prisma.rental.findFirst({ where: { id, userId } });
  }

  findByUser(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<RentalRecord[]> {
    return this.prisma.rental.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  countByUser(userId: string): Promise<number> {
    return this.prisma.rental.count({ where: { userId } });
  }

  getDefaultPricing(): Promise<PricingRuleRecord | null> {
    return this.prisma.pricingRule.findFirst({ where: { isDefault: true } });
  }

  // L-5: slot query methods moved from service

  // Called inside $transaction for start flow (C-4: inside tx to avoid race)
  findSlotWithPowerBankInTx(
    tx: Tx,
    slotId: string,
  ): Promise<SlotWithPowerBank | null> {
    return tx.slot.findUnique({
      where: { id: slotId },
      include: { powerBank: true },
    });
  }

  // Called outside tx for return flow slot validation
  findSlotById(slotId: string): Promise<SlotRow | null> {
    return this.prisma.slot.findUnique({
      where: { id: slotId },
    });
  }

  findSlotWithPowerBank(slotId: string): Promise<SlotWithPowerBank | null> {
    return this.prisma.slot.findUnique({
      where: { id: slotId },
      include: { powerBank: true },
    });
  }

  findFirstRentableSlotByStation(
    stationId: string,
  ): Promise<SlotWithPowerBank | null> {
    return this.prisma.slot.findFirst({
      where: {
        stationId,
        powerBank: {
          is: {
            status: 'idle',
          },
        },
      },
      include: { powerBank: true },
      orderBy: { slotIndex: 'asc' },
    });
  }

  findFirstEmptySlotByStation(stationId: string): Promise<SlotRow | null> {
    return this.prisma.slot.findFirst({
      where: {
        stationId,
        status: 'empty',
        powerBankId: null,
      },
      orderBy: { slotIndex: 'asc' },
    });
  }

  async findNearbyReturnStations(params: {
    lat: number;
    lng: number;
    radiusKm: number;
    limit: number;
  }): Promise<Omit<ReturnStationOption, 'online' | 'supportsReturn'>[]> {
    const radiusMeters = params.radiusKm * 1000;

    const rows = await this.prisma.$queryRaw<RawReturnStationRow[]>`
      SELECT
        s.id,
        s.name,
        s.address,
        s.status,
        s.mqtt_device_id,
        s.last_heartbeat_at,
        ST_Y(s.location::geometry) AS lat,
        ST_X(s.location::geometry) AS lng,
        ST_Distance(
          s.location::geography,
          ST_SetSRID(ST_MakePoint(${params.lng}, ${params.lat}), 4326)::geography
        ) AS distance_meters,
        COUNT(sl.id) FILTER (
          WHERE sl.status = 'empty' AND sl.power_bank_id IS NULL
        ) AS empty_slots
      FROM stations s
      LEFT JOIN slots sl ON sl.station_id = s.id
      WHERE
        s.status = 'active'
        AND ST_DWithin(
          s.location::geography,
          ST_SetSRID(ST_MakePoint(${params.lng}, ${params.lat}), 4326)::geography,
          ${radiusMeters}
        )
      GROUP BY s.id
      ORDER BY distance_meters ASC
      LIMIT ${params.limit}
    `;

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      address: row.address,
      status: row.status as ReturnStationOption['status'],
      mqttDeviceId: row.mqtt_device_id,
      lastHeartbeatAt: row.last_heartbeat_at,
      lat: Number(row.lat),
      lng: Number(row.lng),
      distanceMeters: Number(row.distance_meters),
      emptySlots: Number(row.empty_slots),
    }));
  }

  createRental(
    tx: Tx,
    params: {
      userId: string;
      powerBankId: string;
      startStationId: string;
      startSlotId: string;
      depositAmount: number;
    },
  ): Promise<RentalRecord> {
    return tx.rental.create({ data: params });
  }

  completeRental(
    tx: Tx,
    rentalId: string,
    params: {
      endStationId: string;
      endSlotId: string;
      chargeAmount: number;
      returnedAt: Date;
    },
  ): Promise<RentalRecord> {
    return tx.rental.update({
      where: { id: rentalId },
      data: { ...params, status: 'completed' },
    });
  }

  $transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}
