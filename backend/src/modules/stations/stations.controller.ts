import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiNoContentResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ApiSuccessResponse } from '../../common/swagger/api-success-response.decorator.js';
import { StationsService } from './stations.service.js';
import { NearbyStationsDto } from './dto/nearby-stations.dto.js';
import { CreateStationDto } from './dto/create-station.dto.js';
import {
  StationDetailResponseDto,
  StationNearbyResponseDto,
} from './dto/station-response.dto.js';
import { UpdateStationDto } from './dto/update-station.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles, Role } from '../../common/decorators/roles.decorator.js';

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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiBody({ type: CreateStationDto })
  @ApiSuccessResponse({
    status: HttpStatus.CREATED,
    type: StationDetailResponseDto,
  })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateStationDto) {
    return this.service.create({
      name: dto.name,
      address: dto.address,
      lat: dto.lat,
      lng: dto.lng,
      totalSlots: dto.totalSlots,
      mqttDeviceId: dto.mqttDeviceId,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiBody({ type: UpdateStationDto })
  @ApiSuccessResponse({
    status: HttpStatus.OK,
    type: StationDetailResponseDto,
  })
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStationDto,
  ) {
    return this.service.update(id, {
      name: dto.name,
      address: dto.address,
      lat: dto.lat,
      lng: dto.lng,
      status: dto.status,
      mqttDeviceId: dto.mqttDeviceId,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiNoContentResponse({ description: 'Station амжилттай идэвхгүй болголоо.' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
