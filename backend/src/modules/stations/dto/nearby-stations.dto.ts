import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

const FINITE_NUMBER = { allowNaN: false, allowInfinity: false };

export class NearbyStationsDto {
  @Type(() => Number)
  @IsNumber(FINITE_NUMBER)
  @Min(-90)
  @Max(90)
  lat!: number;

  @Type(() => Number)
  @IsNumber(FINITE_NUMBER)
  @Min(-180)
  @Max(180)
  lng!: number;

  @Type(() => Number)
  @IsNumber(FINITE_NUMBER)
  @Min(0.1)
  @Max(50)
  @IsOptional()
  radiusKm: number = 5;

  @Type(() => Number)
  @IsNumber(FINITE_NUMBER)
  @Min(1)
  @Max(50)
  @IsOptional()
  limit: number = 20;
}
