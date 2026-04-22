import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class OtpVerifyDto {
  @ApiProperty({
    example: '+97699112233',
    description: 'OTP хүсэлт илгээсэн Монгол утасны дугаар',
  })
  @IsString()
  @Matches(/^\+976\d{8}$/, {
    message: 'Монгол утасны дугаар оруулна уу (+976XXXXXXXX)',
  })
  phone!: string;

  @ApiProperty({ example: '123456', minLength: 6, maxLength: 6 })
  @IsString()
  @Length(6, 6, { message: '6 оронтой код оруулна уу' })
  @Matches(/^\d{6}$/, { message: '6 оронтой тоо оруулна уу' })
  code!: string;
}
