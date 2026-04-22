import { ApiProperty } from '@nestjs/swagger';
import type {
  AuthProvider,
  KycStatus,
} from '../../../../generated/prisma/enums.js';
import type { UserRecord } from '../users.types.js';

const AUTH_PROVIDERS = [
  'google',
  'phone_otp',
  'email_password',
  'dan',
] as const;
const KYC_STATUSES = ['none', 'pending', 'verified', 'rejected'] as const;

export class UserResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'user@example.com', nullable: true })
  email!: string | null;

  @ApiProperty({ example: '+97699112233', nullable: true })
  phone!: string | null;

  @ApiProperty({ example: 'Bat-Erdene' })
  name!: string;

  @ApiProperty({ enum: AUTH_PROVIDERS, example: 'phone_otp' })
  primaryAuthMethod!: AuthProvider;

  @ApiProperty({ example: 1 })
  trustTier!: number;

  @ApiProperty({ enum: KYC_STATUSES, example: 'none' })
  kycStatus!: KycStatus;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-04-22T10:30:00.000Z',
    nullable: true,
  })
  kycVerifiedAt!: Date | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-04-22T10:30:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-04-22T10:30:00.000Z',
  })
  updatedAt!: Date;
}

export function toUserResponse(user: UserRecord): UserResponseDto {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    name: user.name,
    primaryAuthMethod: user.primaryAuthMethod,
    trustTier: user.trustTier,
    kycStatus: user.kycStatus,
    kycVerifiedAt: user.kycVerifiedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
