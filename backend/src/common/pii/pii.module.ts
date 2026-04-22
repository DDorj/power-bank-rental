import { Module } from '@nestjs/common';
import { PiiService } from './pii.service.js';

@Module({
  providers: [PiiService],
  exports: [PiiService],
})
export class PiiModule {}
