import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ApiSuccessResponse } from '../../common/swagger/api-success-response.decorator.js';
import { PaymentsService } from './payments.service.js';
import {
  BonumWebhookDto,
  BonumWebhookResponseDto,
} from './dto/bonum-webhook.dto.js';

type RawBodyRequest = Request & { rawBody?: Buffer };

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @ApiBody({ type: BonumWebhookDto })
  @ApiSuccessResponse({
    status: HttpStatus.OK,
    type: BonumWebhookResponseDto,
  })
  @Post('bonum/callback')
  @HttpCode(HttpStatus.OK)
  handleBonumCallback(
    @Body() dto: BonumWebhookDto,
    @Headers('x-checksum-v2') signature: string | undefined,
    @Req() req: RawBodyRequest,
  ) {
    return this.paymentsService.processBonumWebhook(
      dto,
      signature ?? '',
      req.rawBody,
    );
  }
}
