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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiNoContentResponse,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../common/swagger/api-success-response.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles, Role } from '../../common/decorators/roles.decorator.js';
import { AudienceGuard } from '../../common/guards/audience.guard.js';
import { RequireAudience } from '../../common/decorators/require-audience.decorator.js';
import { StationsService } from './stations.service.js';
import { CreateStationDto } from './dto/create-station.dto.js';
import { UpdateStationDto } from './dto/update-station.dto.js';
import {
  AdminStationListResponseDto,
  StationDetailResponseDto,
} from './dto/station-response.dto.js';
import { TOKEN_AUDIENCES } from '../../common/auth/token-audience.js';

@ApiTags('Admin Stations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, AudienceGuard)
@Roles(Role.ADMIN)
@RequireAudience(TOKEN_AUDIENCES.ADMIN_PANEL)
@Controller('admin/stations')
export class AdminStationsController {
  constructor(private readonly service: StationsService) {}

  @ApiSuccessResponse({
    status: HttpStatus.OK,
    type: AdminStationListResponseDto,
    isArray: true,
  })
  @Get()
  list() {
    return this.service.findAdminList();
  }

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

  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiNoContentResponse({ description: 'Station амжилттай идэвхгүй болголоо.' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
