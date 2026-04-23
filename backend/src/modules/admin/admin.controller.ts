import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse } from '../../common/swagger/api-success-response.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { AudienceGuard } from '../../common/guards/audience.guard.js';
import { Roles, Role } from '../../common/decorators/roles.decorator.js';
import { RequireAudience } from '../../common/decorators/require-audience.decorator.js';
import { TOKEN_AUDIENCES } from '../../common/auth/token-audience.js';
import { AdminService } from './admin.service.js';
import { AdminDashboardOverviewResponseDto } from './dto/admin-overview.dto.js';
import {
  AdminPowerBankListItemDto,
  AdminPowerBanksResponseDto,
  AdminRentalListItemDto,
  AdminRentalsResponseDto,
  AdminUserDetailDto,
  AdminUsersResponseDto,
} from './dto/admin-entities.dto.js';
import {
  AdminPaymentDetailDto,
  AdminPaymentsResponseDto,
  AdminWalletTransactionsResponseDto,
} from './dto/admin-transactions.dto.js';

@ApiTags('Admin Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, AudienceGuard)
@Roles(Role.ADMIN)
@RequireAudience(TOKEN_AUDIENCES.ADMIN_PANEL)
@Controller('admin/dashboard')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @ApiSuccessResponse({
    type: AdminDashboardOverviewResponseDto,
  })
  @Get('overview')
  getOverview() {
    return this.adminService.getDashboardOverview();
  }

  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'paid', 'failed', 'expired'],
  })
  @ApiQuery({ name: 'query', required: false, type: String })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    type: String,
    example: '2026-04-20T00:00:00.000Z',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    type: String,
    example: '2026-04-23T23:59:59.999Z',
  })
  @ApiSuccessResponse({
    type: AdminPaymentsResponseDto,
  })
  @Get('payments')
  getPayments(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: 'pending' | 'paid' | 'failed' | 'expired',
    @Query('query') query?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    return this.adminService.getPayments({
      page: p,
      limit: l,
      status,
      query,
      dateFrom: parseOptionalDate(dateFrom),
      dateTo: parseOptionalDate(dateTo),
    });
  }

  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiSuccessResponse({
    type: AdminPaymentDetailDto,
  })
  @Get('payments/:id')
  getPaymentById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getPaymentById(id);
  }

  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['topup', 'freeze', 'unfreeze', 'charge', 'refund', 'adjustment'],
  })
  @ApiQuery({ name: 'userId', required: false, type: String, format: 'uuid' })
  @ApiQuery({ name: 'query', required: false, type: String })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    type: String,
    example: '2026-04-20T00:00:00.000Z',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    type: String,
    example: '2026-04-23T23:59:59.999Z',
  })
  @ApiSuccessResponse({
    type: AdminWalletTransactionsResponseDto,
  })
  @Get('wallet/transactions')
  getWalletTransactions(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('type')
    type?: 'topup' | 'freeze' | 'unfreeze' | 'charge' | 'refund' | 'adjustment',
    @Query('userId') userId?: string,
    @Query('query') query?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    return this.adminService.getWalletTransactions({
      page: p,
      limit: l,
      type,
      userId,
      query,
      dateFrom: parseOptionalDate(dateFrom),
      dateTo: parseOptionalDate(dateTo),
    });
  }

  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'role', required: false, enum: ['user', 'admin'] })
  @ApiQuery({ name: 'query', required: false, type: String })
  @ApiSuccessResponse({
    type: AdminUsersResponseDto,
  })
  @Get('users')
  getUsers(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('role') role?: 'user' | 'admin',
    @Query('query') query?: string,
  ) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    return this.adminService.getUsers({ page: p, limit: l, role, query });
  }

  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiSuccessResponse({
    type: AdminUserDetailDto,
  })
  @Get('users/:id')
  getUserById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getUserById(id);
  }

  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'completed', 'overdue', 'cancelled'],
  })
  @ApiQuery({ name: 'query', required: false, type: String })
  @ApiSuccessResponse({
    type: AdminRentalsResponseDto,
  })
  @Get('rentals')
  getRentals(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: 'active' | 'completed' | 'overdue' | 'cancelled',
    @Query('query') query?: string,
  ) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    return this.adminService.getRentals({ page: p, limit: l, status, query });
  }

  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiSuccessResponse({
    type: AdminRentalListItemDto,
  })
  @Get('rentals/:id')
  getRentalById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getRentalById(id);
  }

  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['idle', 'rented', 'charging', 'faulty'],
  })
  @ApiQuery({ name: 'query', required: false, type: String })
  @ApiSuccessResponse({
    type: AdminPowerBanksResponseDto,
  })
  @Get('power-banks')
  getPowerBanks(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: 'idle' | 'rented' | 'charging' | 'faulty',
    @Query('query') query?: string,
  ) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    return this.adminService.getPowerBanks({
      page: p,
      limit: l,
      status,
      query,
    });
  }

  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiSuccessResponse({
    type: AdminPowerBankListItemDto,
  })
  @Get('power-banks/:id')
  getPowerBankById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getPowerBankById(id);
  }
}

function parseOptionalDate(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
