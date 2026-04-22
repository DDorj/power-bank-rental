import { IsUUID } from 'class-validator';

export class ReturnRentalDto {
  @IsUUID()
  stationId!: string;

  @IsUUID()
  slotId!: string;
}
