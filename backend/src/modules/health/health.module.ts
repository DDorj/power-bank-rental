import { Module } from '@nestjs/common';
import { IotModule } from '../iot/iot.module.js';
import { HealthController } from './health.controller.js';

@Module({
  imports: [IotModule],
  controllers: [HealthController],
})
export class HealthModule {}
