import { Module } from '@nestjs/common';
import { RentalsModule } from '../rentals/rentals.module.js';
import { StationsModule } from '../stations/stations.module.js';
import { WalletModule } from '../wallet/wallet.module.js';
import { AppHomeController } from './app-home.controller.js';
import { AppHomeService } from './app-home.service.js';

@Module({
  imports: [WalletModule, RentalsModule, StationsModule],
  controllers: [AppHomeController],
  providers: [AppHomeService],
})
export class AppHomeModule {}
