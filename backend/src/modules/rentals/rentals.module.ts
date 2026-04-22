import { Module } from '@nestjs/common';
import { RentalsController } from './rentals.controller.js';
import { RentalsService } from './rentals.service.js';
import { RentalsRepository } from './rentals.repository.js';
import { WalletModule } from '../wallet/wallet.module.js';
import { RedisModule } from '../../common/redis/redis.module.js';
import { PrismaModule } from '../../common/prisma/prisma.module.js';

@Module({
  imports: [WalletModule, RedisModule, PrismaModule],
  controllers: [RentalsController],
  providers: [RentalsService, RentalsRepository],
  exports: [RentalsService],
})
export class RentalsModule {}
