import { Module } from '@nestjs/common';
import { AdminStationsController } from './admin-stations.controller.js';
import { StationsController } from './stations.controller.js';
import { StationsService } from './stations.service.js';
import { StationsRepository } from './stations.repository.js';

@Module({
  controllers: [StationsController, AdminStationsController],
  providers: [StationsService, StationsRepository],
  exports: [StationsService],
})
export class StationsModule {}
