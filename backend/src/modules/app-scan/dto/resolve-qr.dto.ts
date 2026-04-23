import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ResolveQrDto {
  @ApiProperty({
    example:
      '{"stationId":"9fad2ae8-be5e-40ac-b1f2-4e782a945fd2","slotId":"slot-uuid"}',
  })
  @IsString()
  @MinLength(1)
  qrData!: string;
}
