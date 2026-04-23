import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class PreviewRentalDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  stationId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  slotId!: string;
}
