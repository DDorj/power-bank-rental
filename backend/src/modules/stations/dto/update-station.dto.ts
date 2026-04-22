import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { StationStatus } from '../../../../generated/prisma/enums.js';

export class UpdateStationDto {
  @ApiPropertyOptional({ example: 'Shangri-La Mall Station', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    example: 'Ulaanbaatar, SBD, Olympic street 19A',
    maxLength: 500,
  })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  address?: string;

  // lat and lng must be provided together or not at all
  @ApiPropertyOptional({ example: 47.9189, minimum: -90, maximum: 90 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-90)
  @Max(90)
  @ValidateIf(
    (o: UpdateStationDto) => o.lat !== undefined || o.lng !== undefined,
  )
  lat?: number;

  @ApiPropertyOptional({ example: 106.9176, minimum: -180, maximum: 180 })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-180)
  @Max(180)
  @ValidateIf(
    (o: UpdateStationDto) => o.lat !== undefined || o.lng !== undefined,
  )
  lng?: number;

  @ApiPropertyOptional({
    enum: ['active', 'inactive', 'maintenance'],
    example: 'maintenance',
  })
  @IsEnum(StationStatus)
  @IsOptional()
  status?: StationStatus;

  @ApiPropertyOptional({ example: 'station-01', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  mqttDeviceId?: string;
}
