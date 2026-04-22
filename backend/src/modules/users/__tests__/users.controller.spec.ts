import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';

jest.mock('../../../common/prisma/prisma.service', () => ({
  PrismaService: jest.fn(),
}));

import { UsersController } from '../users.controller.js';
import { UsersService } from '../users.service.js';
import type { UserRecord } from '../users.types.js';
import type { AuthUser } from '../../../common/decorators/current-user.decorator.js';

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

const mockService = {
  getById: jest.fn(),
};

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockService }],
    }).compile();
    controller = module.get(UsersController);
    jest.clearAllMocks();
  });

  describe('getMe', () => {
    it('calls service.getById with the authenticated user id', async () => {
      mockService.getById.mockResolvedValue(mockUser);
      const authUser: AuthUser = { id: 'uuid-1', trustTier: 1, role: 'user' };

      const result = await controller.getMe(authUser);

      expect(mockService.getById).toHaveBeenCalledWith('uuid-1');
      expect(result).not.toHaveProperty('isActive');
      expect(result).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
        name: mockUser.name,
        trustTier: mockUser.trustTier,
        kycStatus: mockUser.kycStatus,
      });
    });
  });
});
