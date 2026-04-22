export const TOKEN_AUDIENCES = {
  MOBILE_APP: 'mobile-app',
  ADMIN_PANEL: 'admin-panel',
} as const;

export type TokenAudience =
  (typeof TOKEN_AUDIENCES)[keyof typeof TOKEN_AUDIENCES];

export const DEFAULT_TOKEN_AUDIENCE: TokenAudience =
  TOKEN_AUDIENCES.MOBILE_APP;

export function isTokenAudience(value: unknown): value is TokenAudience {
  return (
    value === TOKEN_AUDIENCES.MOBILE_APP || value === TOKEN_AUDIENCES.ADMIN_PANEL
  );
}

export function parseTokenAudience(
  value: string | undefined,
): TokenAudience | null {
  if (!value) return DEFAULT_TOKEN_AUDIENCE;

  const normalized = value.trim().toLowerCase();
  if (normalized === 'app' || normalized === TOKEN_AUDIENCES.MOBILE_APP) {
    return TOKEN_AUDIENCES.MOBILE_APP;
  }

  if (normalized === 'admin' || normalized === TOKEN_AUDIENCES.ADMIN_PANEL) {
    return TOKEN_AUDIENCES.ADMIN_PANEL;
  }

  return null;
}

export function getRefreshTokenPrefix(audience: TokenAudience): string {
  return audience === TOKEN_AUDIENCES.ADMIN_PANEL ? 'admin' : 'app';
}

export function formatRefreshToken(
  audience: TokenAudience,
  secret: string,
): string {
  return `${getRefreshTokenPrefix(audience)}.${secret}`;
}

export function parseAudienceFromRefreshToken(
  rawToken: string,
): TokenAudience | null {
  const [prefix, secret] = rawToken.split('.', 2);
  if (!prefix || !secret) return null;

  if (prefix === 'app') return TOKEN_AUDIENCES.MOBILE_APP;
  if (prefix === 'admin') return TOKEN_AUDIENCES.ADMIN_PANEL;

  return null;
}
