import type {
  AuthProvider,
  KycStatus,
} from '../../../../generated/prisma/enums.js';
import type { UserRecord } from '../users.types.js';

export interface UserResponseDto {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  primaryAuthMethod: AuthProvider;
  trustTier: number;
  kycStatus: KycStatus;
  kycVerifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
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
