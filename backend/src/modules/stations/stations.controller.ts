import {
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import {
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ApiSuccessResponse } from '../../common/swagger/api-success-response.decorator.js';
import { StationsService } from './stations.service.js';
import { NearbyStationsDto } from './dto/nearby-stations.dto.js';
import {
  StationDetailResponseDto,
  StationNearbyResponseDto,
} from './dto/station-response.dto.js';

@ApiTags('Stations')
@Controller('stations')
export class StationsController {
  constructor(private readonly service: StationsService) {}

  @Throttle({ default: { limit: 100, ttl: 60_000 } })
  @ApiSuccessResponse({
    status: HttpStatus.OK,
    type: StationNearbyResponseDto,
    isArray: true,
  })
  @Get('nearby')
  findNearby(@Query() dto: NearbyStationsDto) {
    return this.service.findNearby({
      lat: dto.lat,
      lng: dto.lng,
      radiusKm: dto.radiusKm,
      limit: dto.limit,
    });
  }

  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiSuccessResponse({
    status: HttpStatus.OK,
    type: StationDetailResponseDto,
  })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }
}
