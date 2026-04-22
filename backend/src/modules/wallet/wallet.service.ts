import { Injectable } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service.js';
import { WalletRepository } from './wallet.repository.js';
import {
  InsufficientBalanceException,
  WalletNotFoundException,
} from './wallet.errors.js';
import type {
  ApplyTransactionParams,
  WalletSummary,
  WalletTransactionRecord,
} from './wallet.types.js';
import type { PrismaClient } from '../../../generated/prisma/client.js';

type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

const LOCK_TTL_MS = 5_000;

@Injectable()
export class WalletService {
  constructor(
    private readonly repo: WalletRepository,
    private readonly redis: RedisService,
  ) {}

  async getOrCreate(userId: string): Promise<WalletSummary> {
    const wallet = await this.repo.findOrCreate(userId);
    return {
      ...wallet,
      availableBalance: wallet.balance - wallet.frozenAmount,
    };
  }

  async getTransactions(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ data: WalletTransactionRecord[]; total: number }> {
    const wallet = await this.repo.findByUserId(userId);
    if (!wallet) throw new WalletNotFoundException();

    const offset = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.repo.findTransactions(wallet.id, limit, offset),
      this.repo.countTransactions(wallet.id),
    ]);

    return { data, total };
  }

  // ─── Core mutation (Redis lock + FOR UPDATE) ──────────────────────────────

  async applyTransaction(
    params: ApplyTransactionParams,
  ): Promise<WalletTransactionRecord> {
    const release = await this.redis.acquireLock(
      `wallet:${params.userId}`,
      LOCK_TTL_MS,
    );

    try {
      return await this.repo.$transaction(async (tx) => {
        await this.repo.findOrCreateInTx(tx, params.userId);
        // C-5: single SELECT FOR UPDATE by userId — no pre-lock findUnique
        const lockedWallet = await this.repo.lockWalletByUserId(
          tx,
          params.userId,
        );

        const { newBalance, newFrozen } = this.calculateNewState(
          lockedWallet.balance,
          lockedWallet.frozenAmount,
          params,
        );

        return this.repo.applyInTx(tx, {
          ...params,
          walletId: lockedWallet.id,
          newBalance,
          newFrozen,
        });
      });
    } finally {
      await release();
    }
  }

  // Used when calling from within an existing $transaction (rental start/return).
  // Caller MUST already hold the Redis wallet lock for this userId.
  async applyInExistingTx(
    tx: Tx,
    params: ApplyTransactionParams,
  ): Promise<WalletTransactionRecord> {
    await this.repo.findOrCreateInTx(tx, params.userId);
    const lockedWallet = await this.repo.lockWalletByUserId(tx, params.userId);
    const { newBalance, newFrozen } = this.calculateNewState(
      lockedWallet.balance,
      lockedWallet.frozenAmount,
      params,
    );

    return this.repo.applyInTx(tx, {
      ...params,
      walletId: lockedWallet.id,
      newBalance,
      newFrozen,
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private calculateNewState(
    balance: number,
    frozenAmount: number,
    params: ApplyTransactionParams,
  ): { newBalance: number; newFrozen: number } {
    switch (params.type) {
      case 'topup':
      case 'refund':
        return { newBalance: balance + params.amount, newFrozen: frozenAmount };

      case 'freeze': {
        const available = balance - frozenAmount;
        if (available < params.amount) throw new InsufficientBalanceException();
        return { newBalance: balance, newFrozen: frozenAmount + params.amount };
      }

      case 'unfreeze':
        return {
          newBalance: balance,
          newFrozen: Math.max(0, frozenAmount - params.amount),
        };

      case 'charge': {
        // H-3: charge against available balance (balance minus frozen deposit)
        const available = balance - frozenAmount;
        if (available < params.amount) throw new InsufficientBalanceException();
        return { newBalance: balance - params.amount, newFrozen: frozenAmount };
      }

      case 'adjustment':
        return {
          newBalance: balance + params.amount,
          newFrozen: frozenAmount,
        };

      default:
        throw new Error(`Unknown transaction type: ${String(params.type)}`);
    }
  }
}
