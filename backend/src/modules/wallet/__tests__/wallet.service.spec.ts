import { Test, TestingModule } from '@nestjs/testing';

jest.mock('../../../common/prisma/prisma.service', () => ({
  PrismaService: jest.fn(),
}));

import { WalletService } from '../wallet.service.js';
import { WalletRepository } from '../wallet.repository.js';
import { RedisService } from '../../../common/redis/redis.service.js';
import { InsufficientBalanceException } from '../wallet.errors.js';
import type { WalletRecord } from '../wallet.types.js';

const mockWallet: WalletRecord = {
  id: 'wallet-uuid-1',
  userId: 'user-uuid-1',
  balance: 10000,
  frozenAmount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTxRecord = {
  id: 'tx-uuid-1',
  walletId: 'wallet-uuid-1',
  type: 'topup' as const,
  amount: 5000,
  balanceAfter: 15000,
  frozenAfter: 0,
  referenceId: null,
  description: null,
  createdAt: new Date(),
};

describe('WalletService', () => {
  let service: WalletService;
  let repo: jest.Mocked<WalletRepository>;
  let redis: jest.Mocked<RedisService>;

  const mockRelease = jest.fn().mockResolvedValue(undefined);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: WalletRepository,
          useValue: {
            findByUserId: jest.fn(),
            findOrCreate: jest.fn(),
            createForUser: jest.fn(),
            findTransactions: jest.fn(),
            countTransactions: jest.fn(),
            applyInTx: jest.fn(),
            lockWallet: jest.fn(),
            lockWalletByUserId: jest.fn(),
            $transaction: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            acquireLock: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(WalletService);
    repo = module.get(WalletRepository);
    redis = module.get(RedisService);
  });

  describe('getOrCreate', () => {
    it('returns wallet with availableBalance computed', async () => {
      repo.findOrCreate.mockResolvedValue({
        ...mockWallet,
        balance: 10000,
        frozenAmount: 3000,
      });

      const result = await service.getOrCreate('user-uuid-1');

      expect(result.availableBalance).toBe(7000);
      expect(result.balance).toBe(10000);
      expect(result.frozenAmount).toBe(3000);
    });
  });

  describe('applyTransaction', () => {
    beforeEach(() => {
      redis.acquireLock.mockResolvedValue(mockRelease);
      repo.$transaction.mockImplementation(async (fn) => fn({} as never));
      repo.lockWalletByUserId.mockResolvedValue(mockWallet);
      repo.applyInTx.mockResolvedValue(mockTxRecord);
    });

    it('topup: acquires lock and releases it', async () => {
      redis.acquireLock.mockResolvedValue(mockRelease);
      repo.$transaction.mockResolvedValue(mockTxRecord);

      const result = await service.applyTransaction({
        userId: 'user-uuid-1',
        type: 'topup',
        amount: 5000,
      });

      expect(redis.acquireLock).toHaveBeenCalledWith(
        'wallet:user-uuid-1',
        5000,
      );
      expect(mockRelease).toHaveBeenCalled();
      expect(result).toEqual(mockTxRecord);
    });

    it('releases lock even when transaction throws', async () => {
      redis.acquireLock.mockResolvedValue(mockRelease);
      repo.$transaction.mockRejectedValue(new Error('DB error'));

      await expect(
        service.applyTransaction({
          userId: 'user-uuid-1',
          type: 'topup',
          amount: 1000,
        }),
      ).rejects.toThrow('DB error');

      expect(mockRelease).toHaveBeenCalled();
    });
  });

  describe('calculateNewState (via applyInExistingTx)', () => {
    it('topup: balance increases', async () => {
      repo.applyInTx.mockResolvedValue(mockTxRecord);
      repo.lockWalletByUserId.mockResolvedValue({
        ...mockWallet,
        balance: 5000,
        frozenAmount: 0,
      });

      await service.applyInExistingTx({} as never, {
        userId: 'user-uuid-1',
        type: 'topup',
        amount: 3000,
      });

      expect(repo.applyInTx).toHaveBeenCalledWith(
        {},
        expect.objectContaining({ newBalance: 8000, newFrozen: 0 }),
      );
    });

    it('freeze: throws InsufficientBalanceException when amount > available', async () => {
      repo.lockWalletByUserId.mockResolvedValue({
        ...mockWallet,
        balance: 1000,
        frozenAmount: 0,
      });

      await expect(
        service.applyInExistingTx({} as never, {
          userId: 'user-uuid-1',
          type: 'freeze',
          amount: 5000,
        }),
      ).rejects.toThrow(InsufficientBalanceException);
    });

    it('freeze: succeeds when amount <= available', async () => {
      repo.lockWalletByUserId.mockResolvedValue({
        ...mockWallet,
        balance: 10000,
        frozenAmount: 2000,
      });
      repo.applyInTx.mockResolvedValue(mockTxRecord);

      await service.applyInExistingTx({} as never, {
        userId: 'user-uuid-1',
        type: 'freeze',
        amount: 3000,
      });

      expect(repo.applyInTx).toHaveBeenCalledWith(
        {},
        expect.objectContaining({ newBalance: 10000, newFrozen: 5000 }),
      );
    });

    it('charge: throws InsufficientBalanceException when available balance < amount', async () => {
      // H-3: charge checks balance - frozenAmount, not balance alone
      repo.lockWalletByUserId.mockResolvedValue({
        ...mockWallet,
        balance: 500,
        frozenAmount: 300,
      });

      await expect(
        service.applyInExistingTx({} as never, {
          userId: 'user-uuid-1',
          type: 'charge',
          amount: 300, // available = 500 - 300 = 200, charge 300 → fail
        }),
      ).rejects.toThrow(InsufficientBalanceException);
    });

    it('charge: succeeds when available balance >= amount', async () => {
      repo.lockWalletByUserId.mockResolvedValue({
        ...mockWallet,
        balance: 5000,
        frozenAmount: 3000,
      });
      repo.applyInTx.mockResolvedValue(mockTxRecord);

      await service.applyInExistingTx({} as never, {
        userId: 'user-uuid-1',
        type: 'charge',
        amount: 1500, // available = 5000 - 3000 = 2000 >= 1500 → ok
      });

      expect(repo.applyInTx).toHaveBeenCalledWith(
        {},
        expect.objectContaining({ newBalance: 3500, newFrozen: 3000 }),
      );
    });

    it('unfreeze: frozen_amount decreases, never goes below 0', async () => {
      repo.lockWalletByUserId.mockResolvedValue({
        ...mockWallet,
        balance: 10000,
        frozenAmount: 3000,
      });
      repo.applyInTx.mockResolvedValue(mockTxRecord);

      await service.applyInExistingTx({} as never, {
        userId: 'user-uuid-1',
        type: 'unfreeze',
        amount: 3000,
      });

      expect(repo.applyInTx).toHaveBeenCalledWith(
        {},
        expect.objectContaining({ newBalance: 10000, newFrozen: 0 }),
      );
    });
  });
});
