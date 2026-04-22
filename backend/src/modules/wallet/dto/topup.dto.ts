import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, Max } from 'class-validator';

export class TopupDto {
  @ApiProperty({ example: 5000, minimum: 1000, maximum: 1000000 })
  @IsInt()
  @Min(1000)
  @Max(1_000_000)
  amount!: number;
}
