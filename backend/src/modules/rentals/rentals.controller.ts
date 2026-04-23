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
import {
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../common/swagger/api-success-response.decorator.js';
import { RentalsService } from './rentals.service.js';
import {
  RentalHistoryResponseDto,
  RentalResponseDto,
} from './dto/rental-response.dto.js';
import { AutoReturnRentalDto } from './dto/auto-return-rental.dto.js';
import { AutoStartRentalDto } from './dto/auto-start-rental.dto.js';
import {
  ReturnStationOptionResponseDto,
  ReturnStationsQueryDto,
} from './dto/return-stations.dto.js';
import { StartRentalDto } from './dto/start-rental.dto.js';
import { ReturnRentalDto } from './dto/return-rental.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('Rentals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rentals')
export class RentalsController {
  constructor(private readonly service: RentalsService) {}

  @ApiBody({ type: StartRentalDto })
  @ApiSuccessResponse({
    status: HttpStatus.CREATED,
    type: RentalResponseDto,
  })
  @Post('start')
  @HttpCode(HttpStatus.CREATED)
  start(@CurrentUser() user: AuthUser, @Body() dto: StartRentalDto) {
    return this.service.start({
      userId: user.id,
      stationId: dto.stationId,
      slotId: dto.slotId,
    });
  }

  @ApiBody({ type: AutoStartRentalDto })
  @ApiSuccessResponse({
    status: HttpStatus.CREATED,
    type: RentalResponseDto,
  })
  @Post('start/auto-select')
  @HttpCode(HttpStatus.CREATED)
  startWithAutoSelect(
    @CurrentUser() user: AuthUser,
    @Body() dto: AutoStartRentalDto,
  ) {
    return this.service.startWithAutoSelect(user.id, dto.stationId);
  }

  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiBody({ type: ReturnRentalDto })
  @ApiSuccessResponse({
    status: HttpStatus.OK,
    type: RentalResponseDto,
  })
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

  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiBody({ type: AutoReturnRentalDto })
  @ApiSuccessResponse({
    status: HttpStatus.OK,
    type: RentalResponseDto,
  })
  @Post(':id/return/auto-select')
  @HttpCode(HttpStatus.OK)
  returnWithAutoSelect(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AutoReturnRentalDto,
  ) {
    return this.service.returnWithAutoSelect(id, user.id, dto.stationId);
  }

  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiSuccessResponse({
    status: HttpStatus.OK,
    type: ReturnStationOptionResponseDto,
    isArray: true,
  })
  @Get(':id/return-stations')
  getReturnStations(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() dto: ReturnStationsQueryDto,
  ) {
    return this.service.getReturnStations(id, user.id, {
      lat: dto.lat,
      lng: dto.lng,
      radiusKm: dto.radiusKm,
      limit: dto.limit,
    });
  }

  @ApiSuccessResponse({
    status: HttpStatus.OK,
    type: RentalResponseDto,
    nullable: true,
  })
  @Get('active')
  getActive(@CurrentUser() user: AuthUser) {
    return this.service.getActive(user.id);
  }

  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiSuccessResponse({
    status: HttpStatus.OK,
    type: RentalHistoryResponseDto,
  })
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
