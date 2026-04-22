import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthRepository } from './auth.repository.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { UsersModule } from '../users/users.module.js';
import { SmsModule } from '../../common/sms/sms.module.js';
import { PiiModule } from '../../common/pii/pii.module.js';
import { RedisModule } from '../../common/redis/redis.module.js';
import type { EnvConfig } from '../../config/env.schema.js';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig, true>) => ({
        secret: config.getOrThrow('JWT_SECRET'),
        signOptions: {
          expiresIn:
            config.get('JWT_ACCESS_EXPIRES_IN', { infer: true }) ?? '15m',
        },
      }),
    }),
    UsersModule,
    RedisModule,
    SmsModule,
    PiiModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
