import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../config/env.schema.js';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly config: ConfigService<EnvConfig, true>) {}

  async sendOtp(phone: string, code: string): Promise<void> {
    const apiUrl = this.config.get('SMS_API_URL', { infer: true });
    const apiKey = this.config.get('SMS_API_KEY', { infer: true });

    if (!apiUrl || !apiKey) {
      this.logger.warn(`[DEV] OTP for ${phone}: ${code}`);
      return;
    }

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        phone,
        message: `PowerBank: Таны нэвтрэх код ${code}. 5 минутад хүчинтэй.`,
      }),
    });

    if (!response.ok) {
      this.logger.error(`SMS send failed for ${phone}: ${response.status}`);
      throw new Error('SMS илгээхэд алдаа гарлаа');
    }
  }
}
