import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../../config/env.schema.js';
import type { JwtPayload } from '../auth.types.js';
import type { AuthUser } from '../../../common/decorators/current-user.decorator.js';
import {
  DEFAULT_TOKEN_AUDIENCE,
  isTokenAudience,
} from '../../../common/auth/token-audience.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService<EnvConfig, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow('JWT_SECRET'),
    });
  }

  validate(payload: JwtPayload): AuthUser {
    if (!payload.sub) throw new UnauthorizedException();
    return {
      id: payload.sub,
      trustTier: payload.tier,
      role: payload.role,
      aud: isTokenAudience(payload.aud)
        ? payload.aud
        : DEFAULT_TOKEN_AUDIENCE,
    };
  }
}
