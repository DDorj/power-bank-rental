import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash } from 'crypto';
import type { EnvConfig } from '../../config/env.schema.js';
import { RedisService } from '../../common/redis/redis.service.js';
import { SmsService } from '../../common/sms/sms.service.js';
import { PiiService } from '../../common/pii/pii.service.js';
import { UsersRepository } from '../users/users.repository.js';
import { AuthRepository } from './auth.repository.js';
import { buildAppError } from '../../common/errors/app-errors.js';
import type {
  JwtPayload,
  TokenPair,
  OtpEntry,
  GoogleUserInfo,
  DanUserInfo,
} from './auth.types.js';
import type { UserRecord } from '../users/users.types.js';

const OTP_TTL_SEC = 300;
const OTP_COOLDOWN_SEC = 60;
const OTP_MAX_ATTEMPTS = 5;
const REFRESH_TOKEN_BYTES = 32;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<EnvConfig, true>,
    private readonly redis: RedisService,
    private readonly sms: SmsService,
    private readonly pii: PiiService,
    private readonly usersRepo: UsersRepository,
    private readonly authRepo: AuthRepository,
  ) {}

  // ─── OTP ─────────────────────────────────────────────────────────────────

  async requestOtp(phone: string): Promise<{ expiresAt: Date }> {
    const key = this.otpKey(phone);
    const raw = await this.redis.get(key);

    if (raw) {
      const existing = JSON.parse(raw) as OtpEntry;
      if (existing.cooldownUntil && Date.now() < existing.cooldownUntil) {
        throw new BadRequestException(buildAppError('OTP_COOLDOWN'));
      }
    }

    const code = this.generateOtp();
    const cooldownUntil = Date.now() + OTP_COOLDOWN_SEC * 1000;
    const entry: OtpEntry = { code, attempts: 0, cooldownUntil };

    await this.redis.set(key, JSON.stringify(entry), 'EX', OTP_TTL_SEC);
    await this.sms.sendOtp(phone, code);

    return { expiresAt: new Date(Date.now() + OTP_TTL_SEC * 1000) };
  }

  async verifyOtp(
    phone: string,
    code: string,
  ): Promise<TokenPair & { user: UserRecord }> {
    const key = this.otpKey(phone);
    const raw = await this.redis.get(key);

    if (!raw) {
      throw new BadRequestException(buildAppError('OTP_EXPIRED'));
    }

    const entry = JSON.parse(raw) as OtpEntry;

    if (entry.attempts >= OTP_MAX_ATTEMPTS) {
      await this.redis.del(key);
      throw new BadRequestException(buildAppError('OTP_MAX_ATTEMPTS'));
    }

    if (entry.code !== code) {
      const updated: OtpEntry = { ...entry, attempts: entry.attempts + 1 };
      await this.redis.set(key, JSON.stringify(updated), 'EX', OTP_TTL_SEC);
      throw new BadRequestException(buildAppError('OTP_INVALID'));
    }

    await this.redis.del(key);

    const user = await this.findOrCreatePhoneUser(phone);
    if (!user.isActive) {
      throw new UnauthorizedException(buildAppError('USER_INACTIVE'));
    }

    const tokens = await this.issueTokens(user);
    return { ...tokens, user };
  }

  // ─── Google OAuth ─────────────────────────────────────────────────────────

  async googleLogin(
    info: GoogleUserInfo,
  ): Promise<TokenPair & { user: UserRecord }> {
    const user = await this.findOrCreateGoogleUser(info);
    if (!user.isActive) {
      throw new UnauthorizedException(buildAppError('USER_INACTIVE'));
    }
    const tokens = await this.issueTokens(user);
    return { ...tokens, user };
  }

  // ─── DAN OIDC ────────────────────────────────────────────────────────────

  async initiateDan(userId: string): Promise<{ authUrl: string }> {
    const clientId = this.config.get('DAN_CLIENT_ID', { infer: true });
    const callbackUrl = this.config.get('DAN_CALLBACK_URL', { infer: true });
    const issuerUrl = this.config.get('DAN_ISSUER_URL', { infer: true });

    if (!clientId || !callbackUrl || !issuerUrl) {
      throw new BadRequestException(buildAppError('DAN_NOT_CONFIGURED'));
    }

    const state = randomBytes(32).toString('hex');
    await this.redis.set(`dan:state:${state}`, userId, 'EX', 300);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: callbackUrl,
      scope: 'openid profile national_id',
      state,
    });

    return { authUrl: `${issuerUrl}/authorize?${params.toString()}` };
  }

  async completeDan(
    code: string,
    state: string,
  ): Promise<{ user: UserRecord }> {
    const userId = await this.redis.getdel(`dan:state:${state}`);
    if (!userId) {
      throw new BadRequestException(buildAppError('DAN_INVALID_STATE'));
    }

    const clientId = this.config.get('DAN_CLIENT_ID', { infer: true });
    const clientSecret = this.config.get('DAN_CLIENT_SECRET', { infer: true });
    const callbackUrl = this.config.get('DAN_CALLBACK_URL', { infer: true });
    const issuerUrl = this.config.get('DAN_ISSUER_URL', { infer: true });

    if (!clientId || !clientSecret || !callbackUrl || !issuerUrl) {
      throw new BadRequestException(buildAppError('DAN_NOT_CONFIGURED'));
    }

    const danInfo = await this.exchangeDanCode(
      code,
      clientId,
      clientSecret,
      callbackUrl,
      issuerUrl,
    );

    const user = await this.applyDanVerification(userId, danInfo);
    return { user };
  }

  // ─── Token management ─────────────────────────────────────────────────────

  async refresh(rawToken: string): Promise<TokenPair> {
    const tokenHash = this.hashToken(rawToken);
    const record = await this.authRepo.findRefreshToken(tokenHash);

    if (!record || record.revokedAt !== null || record.expiresAt < new Date()) {
      throw new UnauthorizedException(buildAppError('INVALID_REFRESH_TOKEN'));
    }

    await this.authRepo.revokeRefreshToken(record.id);

    const user = await this.usersRepo.findById(record.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException(buildAppError('USER_INACTIVE'));
    }

    return this.issueTokens(user);
  }

  async logout(rawToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    const record = await this.authRepo.findRefreshToken(tokenHash);
    if (record && !record.revokedAt) {
      await this.authRepo.revokeRefreshToken(record.id);
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async issueTokens(user: UserRecord): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: user.id,
      tier: user.trustTier,
      role: user.role,
    };
    const accessToken = this.jwtService.sign(payload);

    const rawRefresh = randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    const tokenHash = this.hashToken(rawRefresh);

    const refreshExpiresIn = this.config.get('JWT_REFRESH_EXPIRES_IN', {
      infer: true,
    });
    const expiresAt = this.parseExpiry(refreshExpiresIn);
    await this.authRepo.createRefreshToken(user.id, tokenHash, expiresAt);

    return { accessToken, refreshToken: rawRefresh };
  }

  private async findOrCreatePhoneUser(phone: string): Promise<UserRecord> {
    const existing = await this.usersRepo.findByPhone(phone);
    if (existing) return existing;

    return this.usersRepo.create({
      name: phone,
      phone,
      primaryAuthMethod: 'phone_otp',
      providerUserId: phone,
    });
  }

  private async findOrCreateGoogleUser(
    info: GoogleUserInfo,
  ): Promise<UserRecord> {
    const byIdentity = await this.usersRepo.findByIdentity({
      provider: 'google',
      providerUserId: info.sub,
    });
    if (byIdentity) return byIdentity;

    const byEmail = info.email
      ? await this.usersRepo.findByEmail(info.email)
      : null;

    if (byEmail) {
      this.logger.warn(
        `Google account ${info.sub} linked to existing email user ${byEmail.id}`,
      );
      return byEmail;
    }

    return this.usersRepo.create({
      name: info.name,
      email: info.email,
      primaryAuthMethod: 'google',
      providerUserId: info.sub,
    });
  }

  private async applyDanVerification(
    userId: string,
    info: DanUserInfo,
  ): Promise<UserRecord> {
    const salt =
      this.config.get('NATIONAL_ID_HASH_SALT', { infer: true }) ?? 'dev-salt';
    const _nationalIdHash = this.pii.hashNationalId(info.national_id, salt);

    const user = await this.usersRepo.findById(userId);
    if (!user) throw new UnauthorizedException(buildAppError('USER_NOT_FOUND'));

    // Use Prisma directly via repo — avoid circular DI
    this.logger.log(`DAN verification complete for user ${userId}`);

    // This will be wired to DanVerification upsert in the next step
    // For now update trust tier
    return this.usersRepo.updateTrustTier(userId, 2);
  }

  private async exchangeDanCode(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    issuerUrl: string,
  ): Promise<DanUserInfo> {
    const tokenRes = await fetch(`${issuerUrl}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenRes.ok) {
      this.logger.error(`DAN token exchange failed: ${tokenRes.status}`);
      throw new BadRequestException(buildAppError('DAN_AUTH_FAILED'));
    }

    const tokens = (await tokenRes.json()) as { access_token: string };

    const userRes = await fetch(`${issuerUrl}/userinfo`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userRes.ok) {
      throw new BadRequestException(buildAppError('DAN_AUTH_FAILED'));
    }

    return userRes.json() as Promise<DanUserInfo>;
  }

  private otpKey(phone: string): string {
    return `otp:${phone}`;
  }

  private generateOtp(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private parseExpiry(expiry: string): Date {
    const unit = expiry.slice(-1);
    const value = parseInt(expiry.slice(0, -1), 10);
    const ms =
      unit === 'd'
        ? value * 86400000
        : unit === 'h'
          ? value * 3600000
          : unit === 'm'
            ? value * 60000
            : value * 1000;
    return new Date(Date.now() + ms);
  }
}
