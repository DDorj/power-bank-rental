import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

export class OtpRequestDto {
  @ApiProperty({
    example: '+97699112233',
    description: 'Монгол утасны дугаар E.164 форматаар',
  })
  @IsString()
  @Matches(/^\+976\d{8}$/, {
    message: 'Монгол утасны дугаар оруулна уу (+976XXXXXXXX)',
  })
  phone!: string;
}
