import { IsString, Matches } from 'class-validator';

export class OtpRequestDto {
  @IsString()
  @Matches(/^\+976\d{8}$/, {
    message: 'Монгол утасны дугаар оруулна уу (+976XXXXXXXX)',
  })
  phone!: string;
}
