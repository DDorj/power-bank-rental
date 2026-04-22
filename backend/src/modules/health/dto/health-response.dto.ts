import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HealthComponentStatusDto {
  @ApiProperty({ enum: ['ok', 'error'], example: 'ok' })
  status!: 'ok' | 'error';

  @ApiPropertyOptional({ example: 12 })
  latencyMs?: number;

  @ApiPropertyOptional({ example: 'database unreachable' })
  error?: string;
}

export class HealthComponentsDto {
  @ApiProperty({ type: HealthComponentStatusDto })
  database!: HealthComponentStatusDto;

  @ApiProperty({ type: HealthComponentStatusDto })
  redis!: HealthComponentStatusDto;

  @ApiProperty({ type: HealthComponentStatusDto })
  mqtt!: HealthComponentStatusDto;
}

export class HealthLivenessResponseDto {
  @ApiProperty({ enum: ['ok'], example: 'ok' })
  status!: 'ok';

  @ApiProperty({ example: 123.45 })
  uptime!: number;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-04-22T10:30:00.000Z',
  })
  timestamp!: string;
}

export class HealthReadinessResponseDto {
  @ApiProperty({ enum: ['ok', 'degraded'], example: 'ok' })
  status!: 'ok' | 'degraded';

  @ApiProperty({ type: HealthComponentsDto })
  components!: HealthComponentsDto;
}
