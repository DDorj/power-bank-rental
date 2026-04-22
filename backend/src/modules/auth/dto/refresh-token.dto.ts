import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    example: '0f6f7f8b52d94d6c8b2ef5f0dd87f6ea4f5dc1fe9a42e727e4d3ed4d128b11c2',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
