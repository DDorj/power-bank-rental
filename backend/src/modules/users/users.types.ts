import type {
  AuthProvider,
  KycStatus,
  UserRole,
} from '../../../generated/prisma/enums.js';

export interface UserRecord {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  primaryAuthMethod: AuthProvider;
  role: UserRole;
  trustTier: number;
  kycStatus: KycStatus;
  kycVerifiedAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserParams {
  name: string;
  email?: string;
  phone?: string;
  primaryAuthMethod: AuthProvider;
  providerUserId: string;
}

export interface FindByIdentityParams {
  provider: AuthProvider;
  providerUserId: string;
}
