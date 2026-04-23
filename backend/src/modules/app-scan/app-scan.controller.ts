import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../common/swagger/api-success-response.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import {
  AppRentalPreviewResponseDto,
  AppScanResolveResponseDto,
} from './dto/app-scan-response.dto.js';
import { PreviewRentalDto } from './dto/preview-rental.dto.js';
import { ResolveQrDto } from './dto/resolve-qr.dto.js';
import { AppScanService } from './app-scan.service.js';

@ApiTags('App Scan')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('app/scan')
export class AppScanController {
  constructor(private readonly appScanService: AppScanService) {}

  @ApiBody({ type: ResolveQrDto })
  @ApiSuccessResponse({
    status: HttpStatus.OK,
    type: AppScanResolveResponseDto,
  })
  @Post('resolve')
  @HttpCode(HttpStatus.OK)
  resolve(@CurrentUser() user: AuthUser, @Body() dto: ResolveQrDto) {
    return this.appScanService.resolveQr(user.id, dto.qrData);
  }

  @ApiBody({ type: PreviewRentalDto })
  @ApiSuccessResponse({
    status: HttpStatus.OK,
    type: AppRentalPreviewResponseDto,
  })
  @Post('preview-rental')
  @HttpCode(HttpStatus.OK)
  previewRental(@CurrentUser() user: AuthUser, @Body() dto: PreviewRentalDto) {
    return this.appScanService.previewRental(
      user.id,
      dto.stationId,
      dto.slotId,
    );
  }
}
