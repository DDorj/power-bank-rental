import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AutoStartRentalDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  stationId!: string;
}
