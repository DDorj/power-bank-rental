import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StationsRepository } from './stations.repository.js';
import { buildAppError } from '../../common/errors/app-errors.js';
import type { EnvConfig } from '../../config/env.schema.js';
import type {
  StationNearbyRow,
  StationDetail,
  AdminStationListRow,
  CreateStationParams,
  UpdateStationParams,
  NearbyParams,
} from './stations.types.js';

@Injectable()
export class StationsService {
  constructor(
    private readonly repo: StationsRepository,
    private readonly config: ConfigService<EnvConfig, true>,
  ) {}

  async findNearby(params: NearbyParams): Promise<StationNearbyRow[]> {
    const stations = await this.repo.findNearby(params);
    if (!this.isMqttFilteringEnabled()) {
      return stations;
    }

    return stations.filter((station) => this.isOnline(station));
  }

  async findById(id: string): Promise<StationDetail> {
    const station = await this.repo.findById(id);
    if (!station) {
      throw new NotFoundException(buildAppError('STATION_NOT_FOUND'));
    }
    station.online = this.isOnline(station);
    return station;
  }

  async findByMqttDeviceId(mqttDeviceId: string): Promise<StationDetail> {
    const station = await this.repo.findByMqttDeviceId(mqttDeviceId);
    if (!station) {
      throw new NotFoundException(buildAppError('STATION_NOT_FOUND'));
    }
    station.online = this.isOnline(station);
    return station;
  }

  async findAdminList(): Promise<AdminStationListRow[]> {
    const stations = await this.repo.findAdminList();
    return stations.map((station) => ({
      ...station,
      online: this.isOnline(station),
    }));
  }

  create(params: CreateStationParams) {
    return this.repo.create(params);
  }

  async update(id: string, params: UpdateStationParams) {
    await this.assertExists(id);
    return this.repo.update(id, params);
  }

  async remove(id: string): Promise<void> {
    await this.assertExists(id);
    await this.repo.softDelete(id);
  }

  private async assertExists(id: string): Promise<void> {
    const exists = await this.repo.existsById(id);
    if (!exists) {
      throw new NotFoundException(buildAppError('STATION_NOT_FOUND'));
    }
  }

  private isOnline(station: {
    mqttDeviceId: string | null;
    lastHeartbeatAt: Date | null;
  }): boolean {
    if (!this.isMqttFilteringEnabled()) {
      return false;
    }

    const heartbeatTimeoutMs =
      this.config.get('MQTT_HEARTBEAT_TIMEOUT_MS', { infer: true }) ?? 90_000;
    const cutoff = Date.now() - heartbeatTimeoutMs;

    return (
      station.mqttDeviceId !== null &&
      station.lastHeartbeatAt !== null &&
      station.lastHeartbeatAt.getTime() >= cutoff
    );
  }

  private isMqttFilteringEnabled(): boolean {
    return Boolean(this.config.get('MQTT_URL', { infer: true }));
  }
}
