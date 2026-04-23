import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../common/swagger/api-success-response.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { NearbyStationsDto } from '../stations/dto/nearby-stations.dto.js';
import { AppHomeSummaryResponseDto } from './dto/app-home-response.dto.js';
import { AppHomeService } from './app-home.service.js';

@ApiTags('App Home')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('app/home')
export class AppHomeController {
  constructor(private readonly appHomeService: AppHomeService) {}

  @ApiQuery({ name: 'lat', type: Number })
  @ApiQuery({ name: 'lng', type: Number })
  @ApiQuery({ name: 'radiusKm', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiSuccessResponse({
    type: AppHomeSummaryResponseDto,
  })
  @Get('summary')
  getSummary(@CurrentUser() user: AuthUser, @Query() dto: NearbyStationsDto) {
    return this.appHomeService.getSummary(user.id, {
      lat: dto.lat,
      lng: dto.lng,
      radiusKm: dto.radiusKm,
      limit: dto.limit,
    });
  }
}
