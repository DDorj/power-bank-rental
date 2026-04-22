import { Injectable } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import type { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface.js';
import { RedisService } from '../redis/redis.service.js';

@Injectable()
export class ThrottlerStorageRedis implements ThrottlerStorage {
  constructor(private readonly redis: RedisService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const hitKey = `throttle:${key}:${throttlerName}:hits`;
    const blockKey = `throttle:${key}:${throttlerName}:blocked`;

    const blocked = await this.redis.get(blockKey);
    if (blocked) {
      const pttl = await this.redis.pttl(blockKey);
      return {
        totalHits: limit + 1,
        timeToExpire: 0,
        isBlocked: true,
        timeToBlockExpire: Math.ceil(Math.max(pttl, 0) / 1000),
      };
    }

    const totalHits = await this.redis.incr(hitKey);
    if (totalHits === 1) {
      await this.redis.pexpire(hitKey, ttl);
    }
    const remainingPttl = await this.redis.pttl(hitKey);
    const timeToExpire = Math.ceil(Math.max(remainingPttl, 0) / 1000);

    if (totalHits > limit) {
      await this.redis.psetex(blockKey, blockDuration, '1');
      const blockPttl = await this.redis.pttl(blockKey);
      return {
        totalHits,
        timeToExpire,
        isBlocked: true,
        timeToBlockExpire: Math.ceil(Math.max(blockPttl, 0) / 1000),
      };
    }

    return { totalHits, timeToExpire, isBlocked: false, timeToBlockExpire: 0 };
  }
}
