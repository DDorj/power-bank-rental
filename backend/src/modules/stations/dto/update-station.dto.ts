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
  @IsString()
  @MaxLength(200)
  @IsOptional()
  name?: string;

  @IsString()
  @MaxLength(500)
  @IsOptional()
  address?: string;

  // lat and lng must be provided together or not at all
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-90)
  @Max(90)
  @ValidateIf(
    (o: UpdateStationDto) => o.lat !== undefined || o.lng !== undefined,
  )
  lat?: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(-180)
  @Max(180)
  @ValidateIf(
    (o: UpdateStationDto) => o.lat !== undefined || o.lng !== undefined,
  )
  lng?: number;

  @IsEnum(StationStatus)
  @IsOptional()
  status?: StationStatus;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  mqttDeviceId?: string;
}
