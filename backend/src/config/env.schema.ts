import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3001),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().url(),

  MQTT_URL: z.string().min(1).optional(),

  CORS_ORIGINS: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(',').map((s) => s.trim()) : [])),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional(),

  // DAN OIDC
  DAN_CLIENT_ID: z.string().min(1).optional(),
  DAN_CLIENT_SECRET: z.string().min(1).optional(),
  DAN_CALLBACK_URL: z.string().url().optional(),
  DAN_ISSUER_URL: z.string().url().optional(),

  // PII encryption (32-byte key as 64-char hex)
  PII_ENCRYPTION_KEY: z.string().length(64).optional(),
  NATIONAL_ID_HASH_SALT: z.string().min(16).optional(),

  // SMS (Mobicom / Unitel)
  SMS_API_URL: z.string().url().optional(),
  SMS_API_KEY: z.string().min(1).optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${formatted}`);
  }
  return result.data;
}
