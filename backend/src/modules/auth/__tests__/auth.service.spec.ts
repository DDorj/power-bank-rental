import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

jest.mock('../../../common/prisma/prisma.service', () => ({
  PrismaService: jest.fn(),
}));

import { AuthService } from '../auth.service.js';
import { AuthRepository } from '../auth.repository.js';
import { UsersRepository } from '../../users/users.repository.js';
import { RedisService } from '../../../common/redis/redis.service.js';
import { SmsService } from '../../../common/sms/sms.service.js';
import { PiiService } from '../../../common/pii/pii.service.js';
import type { UserRecord } from '../../users/users.types.js';
import type { RefreshTokenModel as RefreshToken } from '../../../../generated/prisma/models/RefreshToken.js';

const mockUser: UserRecord = {
  id: 'user-uuid-1',
  phone: '+97699001234',
  email: null,
  name: '+97699001234',
  primaryAuthMethod: 'phone_otp',
  role: 'user',
  trustTier: 1,
  kycStatus: 'none',
  kycVerifiedAt: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('AuthService', () => {
  let service: AuthService;
  let redis: jest.Mocked<RedisService>;
  let sms: jest.Mocked<SmsService>;
  let usersRepo: jest.Mocked<UsersRepository>;
  let authRepo: jest.Mocked<AuthRepository>;
  let _jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('access-token') },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const cfg: Record<string, string> = {
                JWT_REFRESH_EXPIRES_IN: '7d',
                DAN_CLIENT_ID: 'dan-client',
                DAN_CALLBACK_URL: 'https://api.example.mn/auth/dan/callback',
                DAN_ISSUER_URL: 'https://dan.gov.mn',
                NATIONAL_ID_HASH_SALT: 'test-salt-16chars',
              };
              return cfg[key];
            }),
            getOrThrow: jest.fn((key: string) => {
              if (key === 'JWT_SECRET')
                return 'test-secret-32chars-long-enough!';
              throw new Error(`Missing: ${key}`);
            }),
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            getdel: jest.fn(),
          },
        },
        {
          provide: SmsService,
          useValue: { sendOtp: jest.fn() },
        },
        {
          provide: PiiService,
          useValue: {
            encrypt: jest.fn((v: string) => `enc:${v}`),
            hashNationalId: jest.fn(() => 'hash-abc123'),
          },
        },
        {
          provide: UsersRepository,
          useValue: {
            findByPhone: jest.fn(),
            findByEmail: jest.fn(),
            findByIdentity: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            updateTrustTier: jest.fn(),
          },
        },
        {
          provide: AuthRepository,
          useValue: {
            createRefreshToken: jest.fn(),
            findRefreshToken: jest.fn(),
            revokeRefreshToken: jest.fn(),
            revokeAllUserTokens: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
    redis = module.get(RedisService);
    sms = module.get(SmsService);
    usersRepo = module.get(UsersRepository);
    authRepo = module.get(AuthRepository);
    _jwtService = module.get(JwtService);
  });

  // ─── requestOtp ──────────────────────────────────────────────────────────

  describe('requestOtp', () => {
    it('sends OTP and returns expiresAt when no existing entry', async () => {
      redis.get.mockResolvedValue(null);
      redis.set.mockResolvedValue('OK');
      sms.sendOtp.mockResolvedValue(undefined);

      const result = await service.requestOtp('+97699001234');

      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(sms.sendOtp).toHaveBeenCalledWith(
        '+97699001234',
        expect.stringMatching(/^\d{6}$/),
      );
    });

    it('throws OTP_COOLDOWN when cooldown is active', async () => {
      const entry = JSON.stringify({
        code: '123456',
        attempts: 0,
        cooldownUntil: Date.now() + 50000,
      });
      redis.get.mockResolvedValue(entry);

      await expect(service.requestOtp('+97699001234')).rejects.toThrow(
        BadRequestException,
      );
      expect(sms.sendOtp).not.toHaveBeenCalled();
    });

    it('allows resend after cooldown expires', async () => {
      const entry = JSON.stringify({
        code: '123456',
        attempts: 0,
        cooldownUntil: Date.now() - 1000,
      });
      redis.get.mockResolvedValue(entry);
      redis.set.mockResolvedValue('OK');
      sms.sendOtp.mockResolvedValue(undefined);

      const result = await service.requestOtp('+97699001234');
      expect(result.expiresAt).toBeInstanceOf(Date);
    });
  });

  // ─── verifyOtp ───────────────────────────────────────────────────────────

  describe('verifyOtp', () => {
    it('returns token pair and user on valid OTP', async () => {
      redis.get.mockResolvedValue(
        JSON.stringify({ code: '654321', attempts: 0 }),
      );
      redis.del.mockResolvedValue(1);
      usersRepo.findByPhone.mockResolvedValue(mockUser);
      authRepo.createRefreshToken.mockResolvedValue({} as RefreshToken);

      const result = await service.verifyOtp('+97699001234', '654321');

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toMatch(/^[0-9a-f]{64}$/);
      expect(result.user).toEqual(mockUser);
    });

    it('throws OTP_EXPIRED when no Redis entry exists', async () => {
      redis.get.mockResolvedValue(null);

      await expect(service.verifyOtp('+97699001234', '000000')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('increments attempts on wrong code', async () => {
      redis.get.mockResolvedValue(
        JSON.stringify({ code: '111111', attempts: 2 }),
      );
      redis.set.mockResolvedValue('OK');

      await expect(service.verifyOtp('+97699001234', '999999')).rejects.toThrow(
        BadRequestException,
      );
      expect(redis.set).toHaveBeenCalledWith(
        'otp:+97699001234',
        JSON.stringify({ code: '111111', attempts: 3 }),
        'EX',
        300,
      );
    });

    it('throws OTP_MAX_ATTEMPTS and deletes entry when attempts >= 5', async () => {
      redis.get.mockResolvedValue(
        JSON.stringify({ code: '111111', attempts: 5 }),
      );
      redis.del.mockResolvedValue(1);

      await expect(service.verifyOtp('+97699001234', '999999')).rejects.toThrow(
        BadRequestException,
      );
      expect(redis.del).toHaveBeenCalledWith('otp:+97699001234');
    });

    it('creates new user if not found', async () => {
      redis.get.mockResolvedValue(
        JSON.stringify({ code: '654321', attempts: 0 }),
      );
      redis.del.mockResolvedValue(1);
      usersRepo.findByPhone.mockResolvedValue(null);
      usersRepo.create.mockResolvedValue(mockUser);
      authRepo.createRefreshToken.mockResolvedValue({} as RefreshToken);

      const result = await service.verifyOtp('+97699001234', '654321');
      expect(usersRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ phone: '+97699001234' }),
      );
      expect(result.user).toEqual(mockUser);
    });

    it('throws USER_INACTIVE for inactive user', async () => {
      redis.get.mockResolvedValue(
        JSON.stringify({ code: '654321', attempts: 0 }),
      );
      redis.del.mockResolvedValue(1);
      usersRepo.findByPhone.mockResolvedValue({ ...mockUser, isActive: false });

      await expect(service.verifyOtp('+97699001234', '654321')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ─── refresh ─────────────────────────────────────────────────────────────

  describe('refresh', () => {
    const futureDate = new Date(Date.now() + 86400000);

    it('issues new token pair on valid refresh token', async () => {
      const record: RefreshToken = {
        id: 'rt-id',
        userId: 'user-uuid-1',
        tokenHash: 'any',
        expiresAt: futureDate,
        revokedAt: null,
        createdAt: new Date(),
      };
      authRepo.findRefreshToken.mockResolvedValue(record);
      authRepo.revokeRefreshToken.mockResolvedValue(undefined);
      usersRepo.findById.mockResolvedValue(mockUser);
      authRepo.createRefreshToken.mockResolvedValue({} as RefreshToken);

      const result = await service.refresh('valid-token');
      expect(result.accessToken).toBe('access-token');
    });

    it('throws INVALID_REFRESH_TOKEN when not found', async () => {
      authRepo.findRefreshToken.mockResolvedValue(null);

      await expect(service.refresh('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws INVALID_REFRESH_TOKEN when revoked', async () => {
      authRepo.findRefreshToken.mockResolvedValue({
        id: 'rt-id',
        userId: 'user-uuid-1',
        tokenHash: 'any',
        expiresAt: futureDate,
        revokedAt: new Date(),
        createdAt: new Date(),
      });

      await expect(service.refresh('revoked-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws INVALID_REFRESH_TOKEN when expired', async () => {
      authRepo.findRefreshToken.mockResolvedValue({
        id: 'rt-id',
        userId: 'user-uuid-1',
        tokenHash: 'any',
        expiresAt: new Date(Date.now() - 1000),
        revokedAt: null,
        createdAt: new Date(),
      });

      await expect(service.refresh('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ─── logout ──────────────────────────────────────────────────────────────

  describe('logout', () => {
    it('revokes token when found and not revoked', async () => {
      authRepo.findRefreshToken.mockResolvedValue({
        id: 'rt-id',
        userId: 'user-uuid-1',
        tokenHash: 'any',
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: null,
        createdAt: new Date(),
      });
      authRepo.revokeRefreshToken.mockResolvedValue(undefined);

      await service.logout('some-token');
      expect(authRepo.revokeRefreshToken).toHaveBeenCalledWith('rt-id');
    });

    it('does nothing when token not found', async () => {
      authRepo.findRefreshToken.mockResolvedValue(null);

      await expect(service.logout('unknown')).resolves.not.toThrow();
      expect(authRepo.revokeRefreshToken).not.toHaveBeenCalled();
    });
  });

  // ─── initiateDan ─────────────────────────────────────────────────────────

  describe('initiateDan', () => {
    it('stores state in Redis and returns authUrl', async () => {
      redis.set.mockResolvedValue('OK');

      const result = await service.initiateDan('user-uuid-1');

      expect(result.authUrl).toContain('https://dan.gov.mn/authorize');
      expect(result.authUrl).toContain('client_id=dan-client');
      expect(redis.set).toHaveBeenCalledWith(
        expect.stringMatching(/^dan:state:/),
        'user-uuid-1',
        'EX',
        300,
      );
    });
  });

  // ─── googleLogin ─────────────────────────────────────────────────────────

  describe('googleLogin', () => {
    it('returns tokens for existing Google user', async () => {
      usersRepo.findByIdentity.mockResolvedValue(mockUser);
      authRepo.createRefreshToken.mockResolvedValue({} as RefreshToken);

      const result = await service.googleLogin({
        sub: 'g-sub-123',
        email: 'test@gmail.com',
        name: 'Test User',
        emailVerified: true,
      });

      expect(result.accessToken).toBe('access-token');
      expect(result.user).toEqual(mockUser);
    });

    it('creates user when Google account not found', async () => {
      usersRepo.findByIdentity.mockResolvedValue(null);
      usersRepo.findByEmail.mockResolvedValue(null);
      usersRepo.create.mockResolvedValue(mockUser);
      authRepo.createRefreshToken.mockResolvedValue({} as RefreshToken);

      const result = await service.googleLogin({
        sub: 'g-sub-new',
        email: 'new@gmail.com',
        name: 'New User',
        emailVerified: true,
      });

      expect(usersRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'new@gmail.com',
          primaryAuthMethod: 'google',
        }),
      );
      expect(result.user).toEqual(mockUser);
    });
  });
});
