import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

jest.mock('../../../common/prisma/prisma.service', () => ({
  PrismaService: jest.fn(),
}));

import { UsersService } from '../users.service.js';
import { UsersRepository } from '../users.repository.js';
import type { UserRecord } from '../users.types.js';

const mockUser: UserRecord = {
  id: 'uuid-1',
  email: 'test@example.mn',
  phone: null,
  name: 'Test User',
  primaryAuthMethod: 'phone_otp',
  role: 'user',
  trustTier: 1,
  kycStatus: 'none',
  kycVerifiedAt: null,
  isActive: true,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const mockRepo = {
  findById: jest.fn(),
  findByEmail: jest.fn(),
  findByPhone: jest.fn(),
  findByIdentity: jest.fn(),
  create: jest.fn(),
  updateTrustTier: jest.fn(),
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: mockRepo },
      ],
    }).compile();
    service = module.get(UsersService);
    jest.clearAllMocks();
  });

  describe('getById', () => {
    it('returns user when found', async () => {
      mockRepo.findById.mockResolvedValue(mockUser);
      const result = await service.getById('uuid-1');
      expect(result).toEqual(mockUser);
      expect(mockRepo.findById).toHaveBeenCalledWith('uuid-1');
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.getById('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('exception has USER_NOT_FOUND code and Mongolian message', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.getById('missing')).rejects.toMatchObject({
        response: { code: 'USER_NOT_FOUND', message: 'Хэрэглэгч олдсонгүй' },
      });
    });
  });

  describe('getByEmail', () => {
    it('returns user when found by email', async () => {
      mockRepo.findByEmail.mockResolvedValue(mockUser);
      const result = await service.getByEmail('test@example.mn');
      expect(result).toEqual(mockUser);
    });

    it('returns null when no user with that email', async () => {
      mockRepo.findByEmail.mockResolvedValue(null);
      const result = await service.getByEmail('nobody@example.mn');
      expect(result).toBeNull();
    });
  });

  describe('getByPhone', () => {
    it('returns user when found by phone', async () => {
      const userWithPhone = { ...mockUser, phone: '+97699001122', email: null };
      mockRepo.findByPhone.mockResolvedValue(userWithPhone);
      const result = await service.getByPhone('+97699001122');
      expect(result).toEqual(userWithPhone);
    });

    it('returns null when no user with that phone', async () => {
      mockRepo.findByPhone.mockResolvedValue(null);
      const result = await service.getByPhone('+97600000000');
      expect(result).toBeNull();
    });
  });
});
