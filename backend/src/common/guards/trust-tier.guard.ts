import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_TIER_KEY } from '../decorators/require-tier.decorator.js';
import type { AuthUser } from '../decorators/current-user.decorator.js';
import type { Request } from 'express';
import { buildAppError } from '../errors/app-errors.js';

@Injectable()
export class TrustTierGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<number>(
      REQUIRE_TIER_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );

    if (required === undefined) return true;

    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const user = req.user;

    if (!user || user.trustTier < required) {
      throw new ForbiddenException(buildAppError('TRUST_TIER_INSUFFICIENT'));
    }

    return true;
  }
}
