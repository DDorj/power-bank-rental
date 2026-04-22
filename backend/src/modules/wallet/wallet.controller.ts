import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ApiSuccessResponse } from '../../common/swagger/api-success-response.decorator.js';
import { WalletService } from './wallet.service.js';
import { TopupDto } from './dto/topup.dto.js';
import {
  WalletSummaryResponseDto,
  WalletTopupInvoiceResponseDto,
  WalletTransactionResponseDto,
  WalletTransactionsResponseDto,
} from './dto/wallet-response.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { TrustTierGuard } from '../../common/guards/trust-tier.guard.js';
import { RequireTier } from '../../common/decorators/require-tier.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../../common/decorators/current-user.decorator.js';
import { PaymentsService } from '../payments/payments.service.js';

@ApiTags('Wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(
    private readonly service: WalletService,
    private readonly paymentsService: PaymentsService,
  ) {}

  @ApiSuccessResponse({
    status: HttpStatus.OK,
    type: WalletSummaryResponseDto,
  })
  @Get()
  getWallet(@CurrentUser() user: AuthUser) {
    return this.service.getOrCreate(user.id);
  }

  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiSuccessResponse({
    status: HttpStatus.OK,
    type: WalletTransactionsResponseDto,
  })
  @Get('transactions')
  getTransactions(
    @CurrentUser() user: AuthUser,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    return this.service.getTransactions(user.id, p, l);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(TrustTierGuard)
  @RequireTier(1)
  @ApiBody({ type: TopupDto })
  @ApiSuccessResponse({
    status: HttpStatus.CREATED,
    type: WalletTopupInvoiceResponseDto,
  })
  @Post('topup')
  @HttpCode(HttpStatus.CREATED)
  topup(@CurrentUser() user: AuthUser, @Body() dto: TopupDto) {
    return this.paymentsService.createWalletTopupInvoice(user.id, dto.amount);
  }

  // Dev/test endpoint — real topup goes through Bonum QR flow
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseGuards(TrustTierGuard)
  @RequireTier(1)
  @ApiBody({ type: TopupDto })
  @ApiSuccessResponse({
    status: HttpStatus.OK,
    type: WalletTransactionResponseDto,
  })
  @Post('topup/direct')
  @HttpCode(HttpStatus.OK)
  directTopup(@CurrentUser() user: AuthUser, @Body() dto: TopupDto) {
    if (process.env['NODE_ENV'] === 'production') {
      return { success: false, code: 'NOT_FOUND', message: 'Not found' };
    }
    return this.service.applyTransaction({
      userId: user.id,
      type: 'topup',
      amount: dto.amount,
      description: 'Шууд цэнэглэлт (dev)',
    });
  }
}
