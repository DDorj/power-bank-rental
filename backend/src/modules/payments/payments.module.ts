import { Global, Module } from '@nestjs/common';
import { WalletModule } from '../wallet/wallet.module.js';
import { BonumProvider } from './bonum/bonum.provider.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsRepository } from './payments.repository.js';
import { PaymentsService } from './payments.service.js';

@Global()
@Module({
  imports: [WalletModule],
  controllers: [PaymentsController],
  providers: [BonumProvider, PaymentsRepository, PaymentsService],
  exports: [BonumProvider, PaymentsService],
})
export class PaymentsModule {}
