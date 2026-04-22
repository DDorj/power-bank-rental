import { IsString, Length, Matches } from 'class-validator';

export class OtpVerifyDto {
  @IsString()
  @Matches(/^\+976\d{8}$/, {
    message: 'Монгол утасны дугаар оруулна уу (+976XXXXXXXX)',
  })
  phone!: string;

  @IsString()
  @Length(6, 6, { message: '6 оронтой код оруулна уу' })
  @Matches(/^\d{6}$/, { message: '6 оронтой тоо оруулна уу' })
  code!: string;
}
