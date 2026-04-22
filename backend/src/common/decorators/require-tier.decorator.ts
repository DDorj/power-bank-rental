import { SetMetadata } from '@nestjs/common';

export const REQUIRE_TIER_KEY = 'require_tier';
export const RequireTier = (tier: number) =>
  SetMetadata(REQUIRE_TIER_KEY, tier);
