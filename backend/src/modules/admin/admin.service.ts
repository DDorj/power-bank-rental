import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../config/env.schema.js';
import { buildAppError } from '../../common/errors/app-errors.js';
import { AdminRepository } from './admin.repository.js';
import type {
  AdminDashboardOverview,
  AdminDashboardOverviewSnapshot,
  AdminPaymentDetail,
  AdminPaymentListItem,
  AdminPowerBankListItem,
  AdminRentalListItem,
  AdminUserDetail,
  AdminUserListItem,
  AdminWalletTransactionListItem,
} from './admin.types.js';

@Injectable()
export class AdminService {
  constructor(
    private readonly repo: AdminRepository,
    private readonly config: ConfigService<EnvConfig, true>,
  ) {}

  async getDashboardOverview(): Promise<AdminDashboardOverview> {
    const snapshot = await this.repo.getOverviewSnapshot();
    const { online, offline } = this.calculateCabinetHealth(snapshot);

    return {
      generatedAt: new Date().toISOString(),
      users: snapshot.users,
      stations: {
        total: snapshot.stations.total,
        active: snapshot.stations.active,
        inactive: snapshot.stations.inactive,
        maintenance: snapshot.stations.maintenance,
        online,
        offline,
        totalSlots: snapshot.stations.totalSlots,
        availablePowerBanks: snapshot.stations.availablePowerBanks,
      },
      rentals: snapshot.rentals,
      payments: snapshot.payments,
      wallet: snapshot.wallet,
    };
  }

  getPayments(params: {
    page: number;
    limit: number;
    status?: 'pending' | 'paid' | 'failed' | 'expired';
    query?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<{ data: AdminPaymentListItem[]; total: number }> {
    return this.repo.findPayments(params);
  }

  async getPaymentById(id: string): Promise<AdminPaymentDetail> {
    const payment = await this.repo.findPaymentById(id);
    if (!payment) {
      throw new NotFoundException(buildAppError('BONUM_INVOICE_NOT_FOUND'));
    }
    return payment;
  }

  getWalletTransactions(params: {
    page: number;
    limit: number;
    type?: 'topup' | 'freeze' | 'unfreeze' | 'charge' | 'refund' | 'adjustment';
    userId?: string;
    query?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<{ data: AdminWalletTransactionListItem[]; total: number }> {
    return this.repo.findWalletTransactions(params);
  }

  getUsers(params: {
    page: number;
    limit: number;
    role?: 'user' | 'admin';
    query?: string;
  }): Promise<{ data: AdminUserListItem[]; total: number }> {
    return this.repo.findUsers(params);
  }

  async getUserById(id: string): Promise<AdminUserDetail> {
    const user = await this.repo.findUserById(id);
    if (!user) {
      throw new NotFoundException(buildAppError('USER_NOT_FOUND'));
    }
    return user;
  }

  getRentals(params: {
    page: number;
    limit: number;
    status?: 'active' | 'completed' | 'overdue' | 'cancelled';
    query?: string;
  }): Promise<{ data: AdminRentalListItem[]; total: number }> {
    return this.repo.findRentals(params);
  }

  async getRentalById(id: string): Promise<AdminRentalListItem> {
    const rental = await this.repo.findRentalById(id);
    if (!rental) {
      throw new NotFoundException(buildAppError('RENTAL_NOT_FOUND'));
    }
    return rental;
  }

  getPowerBanks(params: {
    page: number;
    limit: number;
    status?: 'idle' | 'rented' | 'charging' | 'faulty';
    query?: string;
  }): Promise<{ data: AdminPowerBankListItem[]; total: number }> {
    return this.repo.findPowerBanks(params);
  }

  async getPowerBankById(id: string): Promise<AdminPowerBankListItem> {
    const powerBank = await this.repo.findPowerBankById(id);
    if (!powerBank) {
      throw new NotFoundException(buildAppError('POWER_BANK_NOT_FOUND'));
    }
    return powerBank;
  }

  private calculateCabinetHealth(snapshot: AdminDashboardOverviewSnapshot): {
    online: number;
    offline: number;
  } {
    const mqttUrl = this.config.get('MQTT_URL', { infer: true });
    if (!mqttUrl) {
      return { online: 0, offline: 0 };
    }

    const timeoutMs =
      this.config.get('MQTT_HEARTBEAT_TIMEOUT_MS', { infer: true }) ?? 90_000;
    const cutoff = Date.now() - timeoutMs;

    let online = 0;
    let offline = 0;

    for (const station of snapshot.stations.records) {
      if (!station.mqttDeviceId) {
        continue;
      }

      if (
        station.lastHeartbeatAt &&
        station.lastHeartbeatAt.getTime() >= cutoff
      ) {
        online += 1;
      } else {
        offline += 1;
      }
    }

    return { online, offline };
  }
}
