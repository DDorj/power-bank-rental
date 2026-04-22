import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { REQUIRE_AUDIENCE_KEY } from '../decorators/require-audience.decorator.js';
import type { AuthUser } from '../decorators/current-user.decorator.js';
import { buildAppError } from '../errors/app-errors.js';

@Injectable()
export class AudienceGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string>(
      REQUIRE_AUDIENCE_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );

    if (!required) return true;

    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const user = req.user;

    if (!user || user.aud !== required) {
      throw new ForbiddenException(buildAppError('TOKEN_AUDIENCE_INVALID'));
    }

    return true;
  }
}
