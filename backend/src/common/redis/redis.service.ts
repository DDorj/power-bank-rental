import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { Redis } from 'ioredis';
import type { EnvConfig } from '../../config/env.schema.js';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor(config: ConfigService<EnvConfig, true>) {
    this.client = new Redis(config.get('REDIS_URL', { infer: true }));
  }

  async onModuleInit(): Promise<void> {
    await this.client.ping();
    this.logger.log('Redis connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
    this.logger.log('Redis disconnected');
  }

  ping(): Promise<string> {
    return this.client.ping();
  }

  get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  set(key: string, value: string): Promise<'OK'>;
  set(key: string, value: string, mode: 'EX', seconds: number): Promise<'OK'>;
  set(key: string, value: string, mode: 'KEEPTTL'): Promise<'OK'>;
  set(
    key: string,
    value: string,
    mode?: 'EX' | 'KEEPTTL',
    seconds?: number,
  ): Promise<'OK'> {
    if (mode === 'EX' && seconds !== undefined) {
      return this.client.set(key, value, 'EX', seconds);
    }
    if (mode === 'KEEPTTL') {
      return this.client.set(key, value, 'KEEPTTL');
    }
    return this.client.set(key, value);
  }

  psetex(key: string, ms: number, value: string): Promise<string> {
    return this.client.psetex(key, ms, value) as Promise<string>;
  }

  getdel(key: string): Promise<string | null> {
    return this.client.getdel(key);
  }

  del(...keys: string[]): Promise<number> {
    return this.client.del(...keys);
  }

  incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  pexpire(key: string, ms: number): Promise<number> {
    return this.client.pexpire(key, ms);
  }

  pttl(key: string): Promise<number> {
    return this.client.pttl(key);
  }

  // SET NX EX pattern — returns release fn or throws if lock not acquired
  async acquireLock(
    key: string,
    ttlMs: number,
    retries = 3,
    retryDelayMs = 100,
  ): Promise<() => Promise<void>> {
    const token = randomBytes(16).toString('hex');
    const lockKey = `lock:${key}`;

    for (let attempt = 0; attempt < retries; attempt++) {
      const ok = await this.client.set(lockKey, token, 'PX', ttlMs, 'NX');
      if (ok === 'OK') {
        return async () => {
          const current = await this.client.get(lockKey);
          if (current === token) await this.client.del(lockKey);
        };
      }
      if (attempt < retries - 1) {
        const jitter = Math.floor(Math.random() * 50);
        await new Promise((r) => setTimeout(r, retryDelayMs + jitter));
      }
    }

    throw new Error(`Could not acquire lock: ${key}`);
  }
}
