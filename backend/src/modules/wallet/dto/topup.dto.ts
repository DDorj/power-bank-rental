import { IsInt, Min, Max } from 'class-validator';

export class TopupDto {
  @IsInt()
  @Min(1000)
  @Max(1_000_000)
  amount!: number;
}
