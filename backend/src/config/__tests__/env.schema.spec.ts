import { validateEnv } from '../env.schema.js';

describe('validateEnv', () => {
  const base = {
    DATABASE_URL: 'postgresql://pbr:pbr_dev@localhost:5433/pbr',
    REDIS_URL: 'redis://localhost:6380',
    JWT_SECRET: 'test-secret-that-is-at-least-32-characters-long',
  };

  it('returns parsed config with defaults for optional fields', () => {
    const result = validateEnv(base);
    expect(result.NODE_ENV).toBe('development');
    expect(result.PORT).toBe(3001);
    expect(result.DATABASE_URL).toBe(base.DATABASE_URL);
    expect(result.REDIS_URL).toBe(base.REDIS_URL);
  });

  it('coerces PORT string to number', () => {
    const result = validateEnv({ ...base, PORT: '4000' });
    expect(result.PORT).toBe(4000);
  });

  it('throws when DATABASE_URL is missing', () => {
    const rest: Record<string, unknown> = { REDIS_URL: base.REDIS_URL };
    expect(() => validateEnv(rest)).toThrow('Environment validation failed');
  });

  it('throws when REDIS_URL is not a valid URL', () => {
    expect(() => validateEnv({ ...base, REDIS_URL: 'not-a-url' })).toThrow(
      'Environment validation failed',
    );
  });

  it('throws when NODE_ENV is an invalid value', () => {
    expect(() => validateEnv({ ...base, NODE_ENV: 'staging' })).toThrow(
      'Environment validation failed',
    );
  });
});
