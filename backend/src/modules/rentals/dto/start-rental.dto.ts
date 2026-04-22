import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class StartRentalDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  stationId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  slotId!: string;
}
