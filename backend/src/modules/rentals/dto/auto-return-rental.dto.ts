import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AutoReturnRentalDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  stationId!: string;
}
