import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module.js';
import { CabinetCommandService } from './cabinet-command.service.js';
import { IotRepository } from './iot.repository.js';

@Module({
  imports: [PrismaModule],
  providers: [IotRepository, CabinetCommandService],
  exports: [CabinetCommandService],
})
export class IotModule {}
