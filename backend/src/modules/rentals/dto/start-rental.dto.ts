import { IsUUID } from 'class-validator';

export class StartRentalDto {
  @IsUUID()
  stationId!: string;

  @IsUUID()
  slotId!: string;
}
