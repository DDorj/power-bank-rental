import { Module } from '@nestjs/common';
import { RentalsModule } from '../rentals/rentals.module.js';
import { StationsModule } from '../stations/stations.module.js';
import { WalletModule } from '../wallet/wallet.module.js';
import { AppScanController } from './app-scan.controller.js';
import { AppScanService } from './app-scan.service.js';

@Module({
  imports: [StationsModule, WalletModule, RentalsModule],
  controllers: [AppScanController],
  providers: [AppScanService],
})
export class AppScanModule {}
