export interface JwtPayload {
  sub: string;
  tier: number;
  role: string;
  aud: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface OtpEntry {
  code: string;
  attempts: number;
  cooldownUntil?: number;
}

export interface GoogleUserInfo {
  sub: string;
  email: string;
  name: string;
  emailVerified: boolean;
}

export interface DanUserInfo {
  sub: string;
  national_id: string;
  given_name: string;
  family_name: string;
  birthdate?: string;
  gender?: string;
}
