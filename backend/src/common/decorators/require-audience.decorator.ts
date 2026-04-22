import { SetMetadata } from '@nestjs/common';
import type { TokenAudience } from '../auth/token-audience.js';

export const REQUIRE_AUDIENCE_KEY = 'require_audience';
export const RequireAudience = (audience: TokenAudience) =>
  SetMetadata(REQUIRE_AUDIENCE_KEY, audience);
