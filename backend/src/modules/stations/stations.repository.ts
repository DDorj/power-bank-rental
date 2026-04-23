import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type {
  StationRecord,
  StationNearbyRow,
  StationDetail,
  AdminStationListRow,
  CreateStationParams,
  UpdateStationParams,
  NearbyParams,
} from './stations.types.js';

type RawNearbyRow = {
  id: string;
  name: string;
  address: string;
  status: string;
  total_slots: bigint;
  mqtt_device_id: string | null;
  last_heartbeat_at: Date | null;
  created_at: Date;
  updated_at: Date;
  lat: number;
  lng: number;
  distance_meters: number;
  available_slots: bigint;
};

type RawAdminStationRow = {
  id: string;
  name: string;
  address: string;
  status: string;
  total_slots: bigint;
  mqtt_device_id: string | null;
  last_heartbeat_at: Date | null;
  created_at: Date;
  updated_at: Date;
  lat: number;
  lng: number;
  available_slots: bigint;
  occupied_slots: bigint;
};

type RawDetailRow = {
  id: string;
  name: string;
  address: string;
  status: string;
  total_slots: bigint;
  mqtt_device_id: string | null;
  last_heartbeat_at: Date | null;
  created_at: Date;
  updated_at: Date;
  lat: number;
  lng: number;
  available_slots: bigint;
};

@Injectable()
export class StationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findNearby(params: NearbyParams): Promise<StationNearbyRow[]> {
    const radiusMeters = params.radiusKm * 1000;

    const rows = await this.prisma.$queryRaw<RawNearbyRow[]>`
      SELECT
        s.id,
        s.name,
        s.address,
        s.status,
        s.total_slots,
        s.mqtt_device_id,
        s.last_heartbeat_at,
        s.created_at,
        s.updated_at,
        ST_Y(s.location::geometry) AS lat,
        ST_X(s.location::geometry) AS lng,
        ST_Distance(
          s.location::geography,
          ST_SetSRID(ST_MakePoint(${params.lng}, ${params.lat}), 4326)::geography
        ) AS distance_meters,
        COUNT(sl.id) FILTER (WHERE sl.power_bank_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM power_banks pb WHERE pb.id = sl.power_bank_id AND pb.status = 'idle'
        )) AS available_slots
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

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      address: r.address,
      status: r.status as StationRecord['status'],
      totalSlots: Number(r.total_slots),
      mqttDeviceId: r.mqtt_device_id,
      lastHeartbeatAt: r.last_heartbeat_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      lat: Number(r.lat),
      lng: Number(r.lng),
      distanceMeters: Number(r.distance_meters),
      availableSlots: Number(r.available_slots),
    }));
  }

  async findById(id: string): Promise<StationDetail | null> {
    return this.findDetailWhere(
      this.prisma.$queryRaw`
      SELECT
        s.id, s.name, s.address, s.status, s.total_slots,
        s.mqtt_device_id, s.last_heartbeat_at, s.created_at, s.updated_at,
        ST_Y(s.location::geometry) AS lat,
        ST_X(s.location::geometry) AS lng,
        COUNT(sl.id) FILTER (WHERE sl.power_bank_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM power_banks pb WHERE pb.id = sl.power_bank_id AND pb.status = 'idle'
        )) AS available_slots
      FROM stations s
      LEFT JOIN slots sl ON sl.station_id = s.id
      WHERE s.id = ${id}::uuid
      GROUP BY s.id
    `,
      id,
    );
  }

  async findByMqttDeviceId(
    mqttDeviceId: string,
  ): Promise<StationDetail | null> {
    return this.findDetailWhere(this.prisma.$queryRaw`
      SELECT
        s.id, s.name, s.address, s.status, s.total_slots,
        s.mqtt_device_id, s.last_heartbeat_at, s.created_at, s.updated_at,
        ST_Y(s.location::geometry) AS lat,
        ST_X(s.location::geometry) AS lng,
        COUNT(sl.id) FILTER (WHERE sl.power_bank_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM power_banks pb WHERE pb.id = sl.power_bank_id AND pb.status = 'idle'
        )) AS available_slots
      FROM stations s
      LEFT JOIN slots sl ON sl.station_id = s.id
      WHERE s.mqtt_device_id = ${mqttDeviceId}
      GROUP BY s.id
    `);
  }

  private async findDetailWhere(
    query: Promise<RawDetailRow[]>,
    id?: string,
  ): Promise<StationDetail | null> {
    const rows = await query;

    if (rows.length === 0) return null;

    const row = rows[0]!;
    const slots = await this.prisma.slot.findMany({
      where: { stationId: id ?? row.id },
      include: { powerBank: true },
      orderBy: { slotIndex: 'asc' },
    });

    return {
      id: row.id,
      name: row.name,
      address: row.address,
      status: row.status as StationRecord['status'],
      totalSlots: Number(row.total_slots),
      mqttDeviceId: row.mqtt_device_id,
      lastHeartbeatAt: row.last_heartbeat_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lat: Number(row.lat),
      lng: Number(row.lng),
      availableSlots: Number(row.available_slots),
      occupiedSlots: slots.filter((slot) => slot.powerBankId !== null).length,
      online: false,
      supportsReturn: slots.some((slot) => slot.status === 'empty'),
      inventorySummary: {
        totalPowerBanks: slots.filter((slot) => slot.powerBank !== null).length,
        availableCount: slots.filter(
          (slot) => slot.powerBank?.status === 'idle',
        ).length,
        chargingCount: slots.filter(
          (slot) => slot.powerBank?.status === 'charging',
        ).length,
        rentedCount: slots.filter((slot) => slot.powerBank?.status === 'rented')
          .length,
        faultyCount: slots.filter((slot) => slot.powerBank?.status === 'faulty')
          .length,
      },
      slots: slots.map((s) => ({
        id: s.id,
        stationId: s.stationId,
        slotIndex: s.slotIndex,
        status: s.status,
        powerBankId: s.powerBankId,
        updatedAt: s.updatedAt,
        powerBank: s.powerBank,
      })),
    };
  }

  async findAdminList(): Promise<Omit<AdminStationListRow, 'online'>[]> {
    const rows = await this.prisma.$queryRaw<RawAdminStationRow[]>`
      SELECT
        s.id,
        s.name,
        s.address,
        s.status,
        s.total_slots,
        s.mqtt_device_id,
        s.last_heartbeat_at,
        s.created_at,
        s.updated_at,
        ST_Y(s.location::geometry) AS lat,
        ST_X(s.location::geometry) AS lng,
        COUNT(sl.id) FILTER (
          WHERE sl.power_bank_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM power_banks pb
            WHERE pb.id = sl.power_bank_id
            AND pb.status = 'idle'
          )
        ) AS available_slots,
        COUNT(sl.id) FILTER (WHERE sl.power_bank_id IS NOT NULL) AS occupied_slots
      FROM stations s
      LEFT JOIN slots sl ON sl.station_id = s.id
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `;

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      address: row.address,
      status: row.status as StationRecord['status'],
      totalSlots: Number(row.total_slots),
      mqttDeviceId: row.mqtt_device_id,
      lastHeartbeatAt: row.last_heartbeat_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lat: Number(row.lat),
      lng: Number(row.lng),
      availableSlots: Number(row.available_slots),
      occupiedSlots: Number(row.occupied_slots),
    }));
  }

  async create(
    params: CreateStationParams,
  ): Promise<StationRecord & { lat: number; lng: number }> {
    const result = await this.prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO stations (name, address, location, status, total_slots, mqtt_device_id, created_at, updated_at)
      VALUES (
        ${params.name},
        ${params.address},
        ST_SetSRID(ST_MakePoint(${params.lng}, ${params.lat}), 4326),
        'active',
        ${params.totalSlots},
        ${params.mqttDeviceId ?? null},
        NOW(),
        NOW()
      )
      RETURNING id
    `;

    const id = result[0]!.id;

    // Create slots
    if (params.totalSlots > 0) {
      const slotData = Array.from({ length: params.totalSlots }, (_, i) => ({
        stationId: id,
        slotIndex: i,
      }));
      await this.prisma.slot.createMany({ data: slotData });
    }

    const station = await this.findById(id);
    return station!;
  }

  async update(
    id: string,
    params: UpdateStationParams,
  ): Promise<StationRecord & { lat: number; lng: number }> {
    if (params.lat !== undefined && params.lng !== undefined) {
      await this.prisma.$executeRaw`
        UPDATE stations
        SET
          name = COALESCE(${params.name ?? null}, name),
          address = COALESCE(${params.address ?? null}, address),
          location = ST_SetSRID(ST_MakePoint(${params.lng}, ${params.lat}), 4326),
          status = COALESCE(${params.status ?? null}::station_status, status),
          mqtt_device_id = COALESCE(${params.mqttDeviceId ?? null}, mqtt_device_id),
          updated_at = NOW()
        WHERE id = ${id}::uuid
      `;
    } else {
      await this.prisma.$executeRaw`
        UPDATE stations
        SET
          name = COALESCE(${params.name ?? null}, name),
          address = COALESCE(${params.address ?? null}, address),
          status = COALESCE(${params.status ?? null}::station_status, status),
          mqtt_device_id = COALESCE(${params.mqttDeviceId ?? null}, mqtt_device_id),
          updated_at = NOW()
        WHERE id = ${id}::uuid
      `;
    }

    const station = await this.findById(id);
    if (!station) throw new Error(`Station ${id} not found after update`);
    return station;
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.$executeRaw`
      UPDATE stations SET status = 'inactive', updated_at = NOW()
      WHERE id = ${id}::uuid
    `;
  }

  async existsById(id: string): Promise<boolean> {
    const count = await this.prisma.station.count({ where: { id } });
    return count > 0;
  }
}
