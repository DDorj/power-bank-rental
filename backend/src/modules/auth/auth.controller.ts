import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiFoundResponse,
  ApiHeader,
  ApiNoContentResponse,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { ApiSuccessResponse } from '../../common/swagger/api-success-response.decorator.js';
import { AuthService } from './auth.service.js';
import {
  AuthUrlResponseDto,
  OtpRequestResponseDto,
  OtpVerifyResponseDto,
  TokenPairResponseDto,
} from './dto/auth-response.dto.js';
import { OtpRequestDto } from './dto/otp-request.dto.js';
import { OtpVerifyDto } from './dto/otp-verify.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../../common/decorators/current-user.decorator.js';
import { BadRequestException } from '@nestjs/common';
import {
  parseTokenAudience,
  type TokenAudience,
} from '../../common/auth/token-audience.js';
import { buildAppError } from '../../common/errors/app-errors.js';

const APP_SCHEME = 'powerbank://auth/callback';

function resolveAudience(clientType: string | undefined): TokenAudience {
  const audience = parseTokenAudience(clientType);
  if (!audience) {
    throw new BadRequestException(buildAppError('AUTH_CLIENT_INVALID'));
  }
  return audience;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── OTP ─────────────────────────────────────────────────────────────────

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiBody({ type: OtpRequestDto })
  @ApiSuccessResponse({
    status: HttpStatus.OK,
    type: OtpRequestResponseDto,
  })
  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  requestOtp(@Body() dto: OtpRequestDto) {
    return this.authService.requestOtp(dto.phone);
  }

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiBody({ type: OtpVerifyDto })
  @ApiHeader({
    name: 'x-client-type',
    required: false,
    description: 'Optional client type. Allowed: app, admin',
  })
  @ApiSuccessResponse({
    status: HttpStatus.OK,
    type: OtpVerifyResponseDto,
  })
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  verifyOtp(
    @Body() dto: OtpVerifyDto,
    @Headers('x-client-type') clientType?: string,
  ) {
    return this.authService.verifyOtp(
      dto.phone,
      dto.code,
      resolveAudience(clientType),
    );
  }

  // ─── Google OAuth ─────────────────────────────────────────────────────────

  // C-2: CSRF state generated in service and stored in Redis
  @ApiFoundResponse({
    description: 'Google OAuth consent screen рүү redirect хийнэ.',
  })
  @ApiQuery({
    name: 'clientType',
    required: false,
    type: String,
    description: 'Optional client type. Allowed: app, admin',
  })
  @Get('google')
  async googleAuth(
    @Query('clientType') clientType: string | undefined,
    @Res() res: Response,
  ) {
    try {
      const { authUrl } = await this.authService.initiateGoogleAuth(
        resolveAudience(clientType),
      );
      return res.redirect(authUrl);
    } catch {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        success: false,
        code: 'GOOGLE_NOT_CONFIGURED',
        message: 'Google интеграц тохируулагдаагүй байна',
      });
    }
  }

  @ApiFoundResponse({
    description:
      'Mobile app руу амжилттай эсвэл алдаатай callback redirect хийнэ.',
  })
  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    if (error || !code || !state) {
      return res.redirect(
        `${APP_SCHEME}?status=error&error=GOOGLE_AUTH_FAILED`,
      );
    }

    try {
      // S-3: full token exchange delegated to service
      const result = await this.authService.completeGoogleAuth(code, state);
      // C-1: tokens stored in Redis; only short-lived code in URL
      const { code: onetimeCode } =
        await this.authService.issueOnetimeCode(result);
      return res.redirect(`${APP_SCHEME}?status=success&code=${onetimeCode}`);
    } catch (err) {
      // H-1: log errors, don't swallow silently
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`Google callback error: ${msg}`);
      return res.redirect(
        `${APP_SCHEME}?status=error&error=GOOGLE_AUTH_FAILED`,
      );
    }
  }

  // ─── DAN OIDC ────────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiSuccessResponse({
    status: HttpStatus.OK,
    type: AuthUrlResponseDto,
  })
  @Get('dan/initiate')
  initiateDan(@CurrentUser() user: AuthUser) {
    return this.authService.initiateDan(user.id);
  }

  @ApiFoundResponse({
    description: 'DAN баталгаажуулалтын дараа mobile app руу redirect хийнэ.',
  })
  @Get('dan/callback')
  async danCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    if (error || !code || !state) {
      return res.redirect(`${APP_SCHEME}?status=error&error=DAN_AUTH_FAILED`);
    }

    try {
      await this.authService.completeDan(code, state);
      return res.redirect(`${APP_SCHEME}?status=dan_success`);
    } catch (err) {
      // H-1: log errors, don't swallow silently
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`DAN callback error: ${msg}`);
      return res.redirect(`${APP_SCHEME}?status=error&error=DAN_AUTH_FAILED`);
    }
  }

  // ─── Token management ─────────────────────────────────────────────────────

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiBody({ type: RefreshTokenDto })
  @ApiSuccessResponse({
    status: HttpStatus.OK,
    type: TokenPairResponseDto,
  })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiBody({ type: RefreshTokenDto })
  @ApiNoContentResponse({
    description: 'Refresh token амжилттай хүчингүй боллоо.',
  })
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.logout(dto.refreshToken);
  }

  // C-1: mobile app calls this after deep-link redirect to get actual tokens
  @ApiQuery({
    name: 'code',
    type: String,
    description: 'OAuth callback-аас авсан нэг удаагийн код',
  })
  @ApiSuccessResponse({
    status: HttpStatus.OK,
    type: TokenPairResponseDto,
  })
  @Post('exchange')
  @HttpCode(HttpStatus.OK)
  exchangeCode(@Query('code') code: string) {
    return this.authService.exchangeOnetimeCode(code);
  }
}
