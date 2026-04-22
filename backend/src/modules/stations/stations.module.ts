import { Module } from '@nestjs/common';
import { StationsController } from './stations.controller.js';
import { StationsService } from './stations.service.js';
import { StationsRepository } from './stations.repository.js';

@Module({
  controllers: [StationsController],
  providers: [StationsService, StationsRepository],
  exports: [StationsService],
})
export class StationsModule {}
