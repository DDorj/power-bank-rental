import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type {
  UserRecord,
  CreateUserParams,
  FindByIdentityParams,
} from './users.types.js';
import type { AuthProvider } from '../../../generated/prisma/enums.js';

export interface IUsersRepository {
  findById(id: string): Promise<UserRecord | null>;
  findByEmail(email: string): Promise<UserRecord | null>;
  findByPhone(phone: string): Promise<UserRecord | null>;
  findByIdentity(params: FindByIdentityParams): Promise<UserRecord | null>;
  create(params: CreateUserParams): Promise<UserRecord>;
  updateTrustTier(userId: string, tier: number): Promise<UserRecord>;
  markDanVerified(userId: string, verifiedAt: Date, tier: number): Promise<UserRecord>;
  linkIdentity(
    userId: string,
    provider: AuthProvider,
    providerUserId: string,
  ): Promise<void>;
}

@Injectable()
export class UsersRepository implements IUsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findByPhone(phone: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { phone } });
  }

  findByIdentity(params: FindByIdentityParams): Promise<UserRecord | null> {
    return this.prisma.user.findFirst({
      where: {
        identities: {
          some: {
            provider: params.provider,
            providerUserId: params.providerUserId,
          },
        },
      },
    });
  }

  create(params: CreateUserParams): Promise<UserRecord> {
    return this.prisma.user.create({
      data: {
        name: params.name,
        email: params.email ?? null,
        phone: params.phone ?? null,
        primaryAuthMethod: params.primaryAuthMethod,
        identities: {
          create: {
            provider: params.primaryAuthMethod,
            providerUserId: params.providerUserId,
            verifiedAt: new Date(),
          },
        },
      },
    });
  }

  updateTrustTier(userId: string, tier: number): Promise<UserRecord> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { trustTier: tier },
    });
  }

  markDanVerified(
    userId: string,
    verifiedAt: Date,
    tier: number,
  ): Promise<UserRecord> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        trustTier: tier,
        kycStatus: 'verified',
        kycVerifiedAt: verifiedAt,
      },
    });
  }

  async linkIdentity(
    userId: string,
    provider: AuthProvider,
    providerUserId: string,
  ): Promise<void> {
    await this.prisma.authIdentity.upsert({
      where: {
        provider_providerUserId: {
          provider,
          providerUserId,
        },
      },
      update: {
        userId,
        verifiedAt: new Date(),
      },
      create: {
        userId,
        provider,
        providerUserId,
        verifiedAt: new Date(),
      },
    });
  }
}

export type { IUsersRepository as UsersRepositoryInterface };
