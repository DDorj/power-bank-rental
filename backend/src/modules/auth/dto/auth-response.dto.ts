import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto/user-response.dto.js';

export class OtpRequestResponseDto {
  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-04-22T10:30:00.000Z',
  })
  expiresAt!: Date;
}

export class TokenPairResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.access-token-placeholder',
  })
  accessToken!: string;

  @ApiProperty({
    example: '0f6f7f8b52d94d6c8b2ef5f0dd87f6ea4f5dc1fe9a42e727e4d3ed4d128b11c2',
  })
  refreshToken!: string;
}

export class OtpVerifyResponseDto extends TokenPairResponseDto {
  @ApiProperty({ type: UserResponseDto })
  user!: UserResponseDto;
}

export class AuthUrlResponseDto {
  @ApiProperty({
    example:
      'https://accounts.google.com/o/oauth2/v2/auth?client_id=example&state=abc123',
  })
  authUrl!: string;
}
