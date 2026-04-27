import { z } from 'zod';

const emptyStringToUndefined = (value: unknown): unknown =>
  value === '' ? undefined : value;

const optionalString = (schema: z.ZodString) =>
  z.preprocess(emptyStringToUndefined, schema.optional());

const optionalPositiveInt = () =>
  z.preprocess(
    emptyStringToUndefined,
    z.coerce.number().int().positive().optional(),
  );

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().default(3001),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().url(),

  MQTT_URL: optionalString(z.string().min(1)),
  MQTT_ACK_TIMEOUT_MS: optionalPositiveInt(),
  MQTT_HEARTBEAT_TIMEOUT_MS: optionalPositiveInt(),

  CORS_ORIGINS: z
    .string()
    .optional()
    .transform((val) => (val ? val.split(',').map((s) => s.trim()) : [])),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Google OAuth
  GOOGLE_CLIENT_ID: optionalString(z.string().min(1)),
  GOOGLE_CLIENT_SECRET: optionalString(z.string().min(1)),
  GOOGLE_CALLBACK_URL: optionalString(z.string().url()),

  // DAN OIDC
  DAN_CLIENT_ID: optionalString(z.string().min(1)),
  DAN_CLIENT_SECRET: optionalString(z.string().min(1)),
  DAN_CALLBACK_URL: optionalString(z.string().url()),
  DAN_ISSUER_URL: optionalString(z.string().url()),

  // PII encryption (32-byte key as 64-char hex)
  PII_ENCRYPTION_KEY: optionalString(z.string().length(64)),
  NATIONAL_ID_HASH_SALT: optionalString(z.string().min(16)),

  // SMS (Mobicom / Unitel)
  SMS_API_URL: optionalString(z.string().url()),
  SMS_API_KEY: optionalString(z.string().min(1)),
  OTP_FIXED_CODE: optionalString(z.string().regex(/^\d{6}$/)),

  // Bonum Gateway QR pay
  BONUM_BASE_URL: optionalString(z.string().url()),
  BONUM_APP_SECRET: optionalString(z.string().min(1)),
  BONUM_TERMINAL_ID: optionalString(z.string().min(1)),
  BONUM_MERCHANT_CHECKSUM_KEY: optionalString(z.string().min(1)),
  MERCHANT_CHECKSUM_KEY: optionalString(z.string().min(1)),
  BONUM_CALLBACK_URL: optionalString(z.string().url()),
  BONUM_INVOICE_EXPIRES_IN: optionalPositiveInt(),
  BONUM_QR_EXPIRES_IN: optionalPositiveInt(),
  // Deprecated Bonum config keys kept temporarily for compatibility
  BONUM_API_URL: optionalString(z.string().url()),
  BONUM_MERCHANT_ID: optionalString(z.string().min(1)),
  BONUM_MERCHANT_KEY: optionalString(z.string().min(1)),
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
