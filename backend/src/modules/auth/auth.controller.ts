import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service.js';
import { OtpRequestDto } from './dto/otp-request.dto.js';
import { OtpVerifyDto } from './dto/otp-verify.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../../common/decorators/current-user.decorator.js';
import type { EnvConfig } from '../../config/env.schema.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService<EnvConfig, true>,
  ) {}

  // ─── OTP ─────────────────────────────────────────────────────────────────

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  requestOtp(@Body() dto: OtpRequestDto) {
    return this.authService.requestOtp(dto.phone);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Body() dto: OtpVerifyDto) {
    return this.authService.verifyOtp(dto.phone, dto.code);
  }

  // ─── Google OAuth ─────────────────────────────────────────────────────────

  @Get('google')
  googleAuth(@Res() res: Response) {
    const clientId = this.config.get('GOOGLE_CLIENT_ID', { infer: true });
    const callbackUrl = this.config.get('GOOGLE_CALLBACK_URL', { infer: true });

    if (!clientId || !callbackUrl) {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        success: false,
        code: 'GOOGLE_NOT_CONFIGURED',
        message: 'Google интеграц тохируулагдаагүй байна',
      });
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: callbackUrl,
      scope: 'openid email profile',
      access_type: 'offline',
    });

    return res.redirect(
      `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    );
  }

  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    if (error || !code) {
      return res.redirect(this.buildAppRedirect('error', 'GOOGLE_AUTH_FAILED'));
    }

    try {
      const clientId = this.config.get('GOOGLE_CLIENT_ID', { infer: true })!;
      const clientSecret = this.config.get('GOOGLE_CLIENT_SECRET', {
        infer: true,
      })!;
      const callbackUrl = this.config.get('GOOGLE_CALLBACK_URL', {
        infer: true,
      })!;

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: callbackUrl,
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      const tokenData = (await tokenRes.json()) as { access_token: string };

      const userRes = await fetch(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        },
      );
      const userInfo = (await userRes.json()) as {
        sub: string;
        email: string;
        name: string;
        email_verified: boolean;
      };

      const result = await this.authService.googleLogin({
        sub: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name,
        emailVerified: userInfo.email_verified,
      });

      return res.redirect(
        this.buildAppRedirect(
          'success',
          undefined,
          result.accessToken,
          result.refreshToken,
        ),
      );
    } catch {
      return res.redirect(this.buildAppRedirect('error', 'GOOGLE_AUTH_FAILED'));
    }
  }

  // ─── DAN OIDC ────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('dan/initiate')
  initiateDan(@CurrentUser() user: AuthUser) {
    return this.authService.initiateDan(user.id);
  }

  @Get('dan/callback')
  async danCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    if (error || !code || !state) {
      return res.redirect(this.buildAppRedirect('error', 'DAN_AUTH_FAILED'));
    }

    try {
      await this.authService.completeDan(code, state);
      return res.redirect(this.buildAppRedirect('dan_success'));
    } catch {
      return res.redirect(this.buildAppRedirect('error', 'DAN_AUTH_FAILED'));
    }
  }

  // ─── Token management ─────────────────────────────────────────────────────

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.logout(dto.refreshToken);
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private buildAppRedirect(
    status: string,
    error?: string,
    accessToken?: string,
    refreshToken?: string,
  ): string {
    const params = new URLSearchParams({ status });
    if (error) params.set('error', error);
    if (accessToken) params.set('access_token', accessToken);
    if (refreshToken) params.set('refresh_token', refreshToken);
    return `powerbank://auth/callback?${params.toString()}`;
  }
}
