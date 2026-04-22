import { Injectable, NotFoundException } from '@nestjs/common';
import { StationsRepository } from './stations.repository.js';
import { buildAppError } from '../../common/errors/app-errors.js';
import type {
  StationNearbyRow,
  StationDetail,
  CreateStationParams,
  UpdateStationParams,
  NearbyParams,
} from './stations.types.js';

@Injectable()
export class StationsService {
  constructor(private readonly repo: StationsRepository) {}

  findNearby(params: NearbyParams): Promise<StationNearbyRow[]> {
    return this.repo.findNearby(params);
  }

  async findById(id: string): Promise<StationDetail> {
    const station = await this.repo.findById(id);
    if (!station) {
      throw new NotFoundException(buildAppError('STATION_NOT_FOUND'));
    }
    return station;
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
}
