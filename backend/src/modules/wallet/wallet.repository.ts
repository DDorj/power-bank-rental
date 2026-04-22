import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { WalletNotFoundException } from './wallet.errors.js';
import type { PrismaClient } from '../../../generated/prisma/client.js';
import type {
  WalletRecord,
  WalletTransactionRecord,
  ApplyTransactionParams,
} from './wallet.types.js';

type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

@Injectable()
export class WalletRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: string): Promise<WalletRecord | null> {
    return this.prisma.wallet.findUnique({ where: { userId } });
  }

  async createForUser(userId: string): Promise<WalletRecord> {
    return this.prisma.wallet.create({ data: { userId } });
  }

  // S-5: atomic upsert prevents TOCTOU race
  async findOrCreate(userId: string): Promise<WalletRecord> {
    return this.prisma.wallet.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  findOrCreateInTx(tx: Tx, userId: string): Promise<WalletRecord> {
    return tx.wallet.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  findTransactions(
    walletId: string,
    limit: number,
    offset: number,
  ): Promise<WalletTransactionRecord[]> {
    return this.prisma.walletTransaction.findMany({
      where: { walletId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  countTransactions(walletId: string): Promise<number> {
    return this.prisma.walletTransaction.count({ where: { walletId } });
  }

  // Must be called inside prisma.$transaction — uses FOR UPDATE via SELECT
  async applyInTx(
    tx: Tx,
    params: ApplyTransactionParams & {
      walletId: string;
      newBalance: number;
      newFrozen: number;
    },
  ): Promise<WalletTransactionRecord> {
    await tx.$executeRaw`
      UPDATE wallets SET
        balance      = ${params.newBalance},
        frozen_amount = ${params.newFrozen},
        updated_at   = NOW()
      WHERE id = ${params.walletId}::uuid
    `;

    return tx.walletTransaction.create({
      data: {
        walletId: params.walletId,
        type: params.type,
        amount: params.amount,
        balanceAfter: params.newBalance,
        frozenAfter: params.newFrozen,
        referenceId: params.referenceId ?? null,
        description: params.description ?? null,
      },
    });
  }

  // C-5: single lock by walletId (called after we already have walletId)
  async lockWallet(tx: Tx, walletId: string): Promise<WalletRecord> {
    const rows = await tx.$queryRaw<WalletRecord[]>`
      SELECT id, user_id AS "userId", balance, frozen_amount AS "frozenAmount",
             created_at AS "createdAt", updated_at AS "updatedAt"
      FROM wallets WHERE id = ${walletId}::uuid FOR UPDATE
    `;
    if (!rows[0]) throw new WalletNotFoundException();
    return rows[0];
  }

  // C-5: lock directly by userId — eliminates the pre-lock findUnique
  async lockWalletByUserId(tx: Tx, userId: string): Promise<WalletRecord> {
    const rows = await tx.$queryRaw<WalletRecord[]>`
      SELECT id, user_id AS "userId", balance, frozen_amount AS "frozenAmount",
             created_at AS "createdAt", updated_at AS "updatedAt"
      FROM wallets WHERE user_id = ${userId}::uuid FOR UPDATE
    `;
    if (!rows[0]) throw new WalletNotFoundException();
    return rows[0];
  }

  $transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}
