import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import { RedisService } from '../../common/redis/redis.service.js';
import { ApiSuccessResponse } from '../../common/swagger/api-success-response.decorator.js';
import { CabinetCommandService } from '../iot/cabinet-command.service.js';
import {
  HealthComponentStatusDto,
  HealthLivenessResponseDto,
  HealthReadinessResponseDto,
} from './dto/health-response.dto.js';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly cabinetCommands: CabinetCommandService,
  ) {}

  @ApiSuccessResponse({ type: HealthLivenessResponseDto })
  @Get()
  liveness(): HealthLivenessResponseDto {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @ApiSuccessResponse({ type: HealthReadinessResponseDto })
  @Get('ready')
  @HttpCode(HttpStatus.OK)
  async readiness(): Promise<HealthReadinessResponseDto> {
    const [database, redis, mqtt] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      Promise.resolve(this.checkMqtt()),
    ]);

    const allOk =
      database.status === 'ok' &&
      redis.status === 'ok' &&
      mqtt.status === 'ok';

    if (!allOk) {
      throw new ServiceUnavailableException({
        status: 'degraded',
        components: { database, redis, mqtt },
      });
    }

    return { status: 'ok', components: { database, redis, mqtt } };
  }

  private async checkDatabase(): Promise<HealthComponentStatusDto> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', latencyMs: Date.now() - start };
    } catch (err) {
      this.logger.error('Database health check failed', err);
      return {
        status: 'error',
        latencyMs: Date.now() - start,
        error: 'database unreachable',
      };
    }
  }

  private async checkRedis(): Promise<HealthComponentStatusDto> {
    const start = Date.now();
    try {
      await this.redis.ping();
      return { status: 'ok', latencyMs: Date.now() - start };
    } catch (err) {
      this.logger.error('Redis health check failed', err);
      return {
        status: 'error',
        latencyMs: Date.now() - start,
        error: 'redis unreachable',
      };
    }
  }

  private checkMqtt(): HealthComponentStatusDto {
    const start = Date.now();
    const status = this.cabinetCommands.getHealthStatus();

    if (status.status === 'ok') {
      return { status: 'ok', latencyMs: Date.now() - start };
    }

    return {
      status: 'error',
      latencyMs: Date.now() - start,
      error: status.error ?? 'mqtt broker unavailable',
    };
  }
}
