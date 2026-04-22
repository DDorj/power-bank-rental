import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RentalsService } from './rentals.service.js';
import { StartRentalDto } from './dto/start-rental.dto.js';
import { ReturnRentalDto } from './dto/return-rental.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../../common/decorators/current-user.decorator.js';

@UseGuards(JwtAuthGuard)
@Controller('rentals')
export class RentalsController {
  constructor(private readonly service: RentalsService) {}

  @Post('start')
  @HttpCode(HttpStatus.CREATED)
  start(@CurrentUser() user: AuthUser, @Body() dto: StartRentalDto) {
    return this.service.start({
      userId: user.id,
      stationId: dto.stationId,
      slotId: dto.slotId,
    });
  }

  @Post(':id/return')
  @HttpCode(HttpStatus.OK)
  returnRental(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReturnRentalDto,
  ) {
    return this.service.return({
      rentalId: id,
      userId: user.id,
      stationId: dto.stationId,
      slotId: dto.slotId,
    });
  }

  @Get('active')
  getActive(@CurrentUser() user: AuthUser) {
    return this.service.getActive(user.id);
  }

  @Get('history')
  getHistory(
    @CurrentUser() user: AuthUser,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    return this.service.getHistory(user.id, p, l);
  }
}
