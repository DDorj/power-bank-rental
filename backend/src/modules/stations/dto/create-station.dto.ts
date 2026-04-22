import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateStationDto {
  @ApiProperty({ example: 'Shangri-La Mall Station', maxLength: 200 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiProperty({
    example: 'Ulaanbaatar, SBD, Olympic street 19A',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  address!: string;

  @ApiProperty({ example: 47.9189, minimum: -90, maximum: 90 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({ example: 106.9176, minimum: -180, maximum: 180 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng!: number;

  @ApiProperty({ example: 12, minimum: 1, maximum: 30 })
  @IsInt()
  @Min(1)
  @Max(30)
  totalSlots!: number;

  @ApiPropertyOptional({ example: 'station-01', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  mqttDeviceId?: string;
}
