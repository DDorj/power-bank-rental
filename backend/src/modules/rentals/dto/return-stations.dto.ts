import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

const FINITE_NUMBER = { allowNaN: false, allowInfinity: false };

export class ReturnStationsQueryDto {
  @ApiProperty({ example: 47.9189, minimum: -90, maximum: 90 })
  @Type(() => Number)
  @IsNumber(FINITE_NUMBER)
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({ example: 106.9176, minimum: -180, maximum: 180 })
  @Type(() => Number)
  @IsNumber(FINITE_NUMBER)
  @Min(-180)
  @Max(180)
  lng!: number;

  @ApiPropertyOptional({ example: 5, minimum: 0.1, maximum: 50, default: 5 })
  @Type(() => Number)
  @IsNumber(FINITE_NUMBER)
  @Min(0.1)
  @Max(50)
  @IsOptional()
  radiusKm: number = 5;

  @ApiPropertyOptional({ example: 20, minimum: 1, maximum: 50, default: 20 })
  @Type(() => Number)
  @IsNumber(FINITE_NUMBER)
  @Min(1)
  @Max(50)
  @IsOptional()
  limit: number = 20;
}

export class ReturnStationOptionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Shangri-La Mall' })
  name!: string;

  @ApiProperty({ example: 'Olympic street 19A, Ulaanbaatar' })
  address!: string;

  @ApiProperty({ example: 'active' })
  status!: 'active' | 'inactive' | 'maintenance';

  @ApiProperty({ example: 'cabinet-demo-1', nullable: true })
  mqttDeviceId!: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lastHeartbeatAt!: Date | null;

  @ApiProperty({ example: 47.9136 })
  lat!: number;

  @ApiProperty({ example: 106.9155 })
  lng!: number;

  @ApiProperty({ example: 120 })
  distanceMeters!: number;

  @ApiProperty({ example: 3 })
  emptySlots!: number;

  @ApiProperty({ example: true })
  online!: boolean;

  @ApiProperty({ example: true })
  supportsReturn!: boolean;
}
