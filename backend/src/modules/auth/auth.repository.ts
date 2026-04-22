import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type { RefreshTokenModel as RefreshToken } from '../../../generated/prisma/models/RefreshToken.js';

export interface UpsertDanVerificationParams {
  userId: string;
  nationalIdHash: string;
  givenName: string;
  familyName: string;
  birthdate?: string;
  gender?: string;
  danSessionId?: string;
  verifiedAt: Date;
  expiresAt: Date;
}

export interface IAuthRepository {
  createRefreshToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<RefreshToken>;
  findRefreshToken(tokenHash: string): Promise<RefreshToken | null>;
  findDanVerificationByNationalIdHash(
    nationalIdHash: string,
  ): Promise<{ userId: string } | null>;
  revokeRefreshToken(id: string): Promise<void>;
  revokeAllUserTokens(userId: string): Promise<void>;
  upsertDanVerification(params: UpsertDanVerificationParams): Promise<void>;
}

@Injectable()
export class AuthRepository implements IAuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  createRefreshToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });
  }

  // M-9: tokenHash has a unique index — findUnique is correct here
  findRefreshToken(tokenHash: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findUnique({ where: { tokenHash } });
  }

  findDanVerificationByNationalIdHash(
    nationalIdHash: string,
  ): Promise<{ userId: string } | null> {
    return this.prisma.danVerification.findFirst({
      where: { nationalIdHash },
      select: { userId: true },
    });
  }

  revokeRefreshToken(id: string): Promise<void> {
    return this.prisma.refreshToken
      .update({ where: { id }, data: { revokedAt: new Date() } })
      .then(() => undefined);
  }

  revokeAllUserTokens(userId: string): Promise<void> {
    return this.prisma.refreshToken
      .updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      })
      .then(() => undefined);
  }

  // C-8: persist DAN verification with encrypted PII
  async upsertDanVerification(
    params: UpsertDanVerificationParams,
  ): Promise<void> {
    await this.prisma.danVerification.upsert({
      where: { userId: params.userId },
      update: {
        nationalIdHash: params.nationalIdHash,
        givenName: params.givenName,
        familyName: params.familyName,
        birthdate: params.birthdate ?? null,
        gender: params.gender ?? null,
        danSessionId: params.danSessionId ?? null,
        verifiedAt: params.verifiedAt,
        expiresAt: params.expiresAt,
      },
      create: {
        userId: params.userId,
        nationalIdHash: params.nationalIdHash,
        givenName: params.givenName,
        familyName: params.familyName,
        birthdate: params.birthdate ?? null,
        gender: params.gender ?? null,
        danSessionId: params.danSessionId ?? null,
        verifiedAt: params.verifiedAt,
        expiresAt: params.expiresAt,
      },
    });
  }
}
