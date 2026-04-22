import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from 'crypto';
import type { EnvConfig } from '../../config/env.schema.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

@Injectable()
export class PiiService {
  private readonly logger = new Logger(PiiService.name);
  private readonly key: Buffer | null;

  constructor(config: ConfigService<EnvConfig, true>) {
    const hexKey = config.get('PII_ENCRYPTION_KEY', { infer: true });
    if (hexKey) {
      const buf = Buffer.from(hexKey, 'hex');
      if (buf.length !== 32) {
        throw new Error(
          `PII_ENCRYPTION_KEY must be exactly 32 bytes (64 hex chars), got ${buf.length}`,
        );
      }
      this.key = buf;
    } else {
      this.key = null;
    }
  }

  encrypt(plaintext: string): string {
    if (!this.key) {
      this.logger.warn(
        'PII_ENCRYPTION_KEY not set — storing plaintext (dev only)',
      );
      return plaintext;
    }

    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return Buffer.concat([iv, tag, encrypted]).toString('base64');
  }

  decrypt(ciphertext: string): string {
    if (!this.key) {
      return ciphertext;
    }

    try {
      const buf = Buffer.from(ciphertext, 'base64');
      const iv = buf.subarray(0, IV_LENGTH);
      const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
      const encrypted = buf.subarray(IV_LENGTH + TAG_LENGTH);

      const decipher = createDecipheriv(ALGORITHM, this.key, iv);
      decipher.setAuthTag(tag);

      return (
        decipher.update(encrypted).toString('utf8') + decipher.final('utf8')
      );
    } catch {
      this.logger.error('PII decryption failed');
      throw new InternalServerErrorException('Мэдээлэл уншихад алдаа гарлаа');
    }
  }

  hashNationalId(nationalId: string, salt: string): string {
    return createHash('sha256')
      .update(nationalId + salt)
      .digest('hex');
  }
}
