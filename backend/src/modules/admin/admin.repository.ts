import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service.js';
import type {
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
export class AdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getOverviewSnapshot(): Promise<AdminDashboardOverviewSnapshot> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      activeUsers,
      adminUsers,
      verifiedUsers,
      stationStatusCounts,
      stationAggregate,
      stationRecords,
      availablePowerBanks,
      activeRentals,
      completedRentals,
      overdueRentals,
      completedToday,
      pendingInvoices,
      paidToday,
      paidInvoiceAggregate,
      walletAggregate,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { role: 'admin' } }),
      this.prisma.user.count({ where: { kycStatus: 'verified' } }),
      this.prisma.station.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.station.aggregate({
        _sum: { totalSlots: true },
      }),
      this.prisma.station.findMany({
        select: {
          mqttDeviceId: true,
          lastHeartbeatAt: true,
        },
      }),
      this.prisma.powerBank.count({ where: { status: 'idle' } }),
      this.prisma.rental.count({ where: { status: 'active' } }),
      this.prisma.rental.count({ where: { status: 'completed' } }),
      this.prisma.rental.count({ where: { status: 'overdue' } }),
      this.prisma.rental.count({
        where: {
          status: 'completed',
          returnedAt: { gte: todayStart },
        },
      }),
      this.prisma.bonumInvoice.count({ where: { status: 'pending' } }),
      this.prisma.bonumInvoice.count({
        where: {
          status: 'paid',
          paidAt: { gte: todayStart },
        },
      }),
      this.prisma.bonumInvoice.aggregate({
        where: { status: 'paid' },
        _sum: { amount: true },
      }),
      this.prisma.wallet.aggregate({
        _sum: {
          balance: true,
          frozenAmount: true,
        },
      }),
    ]);

    const stationCounts = {
      active: 0,
      inactive: 0,
      maintenance: 0,
    };

    for (const row of stationStatusCounts) {
      stationCounts[row.status] = row._count._all;
    }

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        admins: adminUsers,
        kycVerified: verifiedUsers,
      },
      stations: {
        total: stationRecords.length,
        active: stationCounts.active,
        inactive: stationCounts.inactive,
        maintenance: stationCounts.maintenance,
        totalSlots: stationAggregate._sum.totalSlots ?? 0,
        availablePowerBanks,
        records: stationRecords,
      },
      rentals: {
        active: activeRentals,
        completed: completedRentals,
        overdue: overdueRentals,
        completedToday,
      },
      payments: {
        pendingInvoices,
        paidToday,
        totalTopupAmount: paidInvoiceAggregate._sum.amount ?? 0,
      },
      wallet: {
        totalBalance: walletAggregate._sum.balance ?? 0,
        totalFrozenAmount: walletAggregate._sum.frozenAmount ?? 0,
      },
    };
  }

  async findPayments(params: {
    page: number;
    limit: number;
    status?: 'pending' | 'paid' | 'failed' | 'expired';
    query?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<{ data: AdminPaymentListItem[]; total: number }> {
    const skip = (params.page - 1) * params.limit;
    const where = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.query
        ? {
            OR: [
              {
                transactionId: {
                  contains: params.query,
                  mode: 'insensitive' as const,
                },
              },
              {
                invoiceId: {
                  contains: params.query,
                  mode: 'insensitive' as const,
                },
              },
              {
                paymentTransactionId: {
                  contains: params.query,
                  mode: 'insensitive' as const,
                },
              },
              {
                user: {
                  name: {
                    contains: params.query,
                    mode: 'insensitive' as const,
                  },
                },
              },
              {
                user: {
                  phone: {
                    contains: params.query,
                    mode: 'insensitive' as const,
                  },
                },
              },
            ],
          }
        : {}),
      ...(params.dateFrom || params.dateTo
        ? {
            createdAt: {
              ...(params.dateFrom ? { gte: params.dateFrom } : {}),
              ...(params.dateTo ? { lte: params.dateTo } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.bonumInvoice.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: params.limit,
        skip,
      }),
      this.prisma.bonumInvoice.count({ where }),
    ]);

    return {
      data: data.map((item) => ({
        id: item.id,
        userId: item.user.id,
        userName: item.user.name,
        userPhone: item.user.phone,
        transactionId: item.transactionId,
        invoiceId: item.invoiceId,
        amount: item.amount,
        purpose: item.purpose,
        status: item.status,
        followUpLink: item.followUpLink,
        expiresAt: item.expiresAt,
        paidAt: item.paidAt,
        paymentTransactionId: item.paymentTransactionId,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      total,
    };
  }

  async findPaymentById(id: string): Promise<AdminPaymentDetail | null> {
    const item = await this.prisma.bonumInvoice.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        webhookEvents: {
          select: {
            id: true,
            transactionId: true,
            eventType: true,
            receivedAt: true,
            processedAt: true,
          },
          orderBy: { receivedAt: 'desc' },
        },
      },
    });

    if (!item) {
      return null;
    }

    return {
      id: item.id,
      userId: item.user.id,
      userName: item.user.name,
      userPhone: item.user.phone,
      transactionId: item.transactionId,
      invoiceId: item.invoiceId,
      amount: item.amount,
      purpose: item.purpose,
      status: item.status,
      followUpLink: item.followUpLink,
      expiresAt: item.expiresAt,
      paidAt: item.paidAt,
      paymentTransactionId: item.paymentTransactionId,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      webhookEvents: item.webhookEvents.map((event) => ({
        id: event.id,
        transactionId: event.transactionId,
        eventType: event.eventType,
        receivedAt: event.receivedAt,
        processedAt: event.processedAt,
      })),
    };
  }

  async findWalletTransactions(params: {
    page: number;
    limit: number;
    type?: 'topup' | 'freeze' | 'unfreeze' | 'charge' | 'refund' | 'adjustment';
    userId?: string;
    query?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<{ data: AdminWalletTransactionListItem[]; total: number }> {
    const skip = (params.page - 1) * params.limit;
    const where = {
      ...(params.type ? { type: params.type } : {}),
      ...(params.userId ? { wallet: { userId: params.userId } } : {}),
      ...(params.query
        ? {
            OR: [
              {
                referenceId: {
                  contains: params.query,
                  mode: 'insensitive' as const,
                },
              },
              {
                description: {
                  contains: params.query,
                  mode: 'insensitive' as const,
                },
              },
              {
                wallet: {
                  user: {
                    name: {
                      contains: params.query,
                      mode: 'insensitive' as const,
                    },
                  },
                },
              },
              {
                wallet: {
                  user: {
                    phone: {
                      contains: params.query,
                      mode: 'insensitive' as const,
                    },
                  },
                },
              },
            ],
          }
        : {}),
      ...(params.dateFrom || params.dateTo
        ? {
            createdAt: {
              ...(params.dateFrom ? { gte: params.dateFrom } : {}),
              ...(params.dateTo ? { lte: params.dateTo } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where,
        include: {
          wallet: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: params.limit,
        skip,
      }),
      this.prisma.walletTransaction.count({ where }),
    ]);

    return {
      data: data.map((item) => ({
        id: item.id,
        walletId: item.walletId,
        userId: item.wallet.user.id,
        userName: item.wallet.user.name,
        userPhone: item.wallet.user.phone,
        type: item.type,
        amount: item.amount,
        balanceAfter: item.balanceAfter,
        frozenAfter: item.frozenAfter,
        referenceId: item.referenceId,
        description: item.description,
        createdAt: item.createdAt,
      })),
      total,
    };
  }

  async findUsers(params: {
    page: number;
    limit: number;
    role?: 'user' | 'admin';
    query?: string;
  }): Promise<{ data: AdminUserListItem[]; total: number }> {
    const skip = (params.page - 1) * params.limit;
    const where = {
      ...(params.role ? { role: params.role } : {}),
      ...(params.query
        ? {
            OR: [
              {
                name: { contains: params.query, mode: 'insensitive' as const },
              },
              {
                phone: { contains: params.query, mode: 'insensitive' as const },
              },
              {
                email: { contains: params.query, mode: 'insensitive' as const },
              },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          wallet: true,
          rentals: {
            where: { status: 'active' },
            select: { id: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: params.limit,
        skip,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: data.map((item) => ({
        id: item.id,
        name: item.name,
        phone: item.phone,
        email: item.email,
        role: item.role,
        trustTier: item.trustTier,
        kycStatus: item.kycStatus,
        isActive: item.isActive,
        walletBalance: item.wallet?.balance ?? 0,
        walletFrozenAmount: item.wallet?.frozenAmount ?? 0,
        activeRentalCount: item.rentals.length,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      total,
    };
  }

  async findUserById(id: string): Promise<AdminUserDetail | null> {
    const item = await this.prisma.user.findUnique({
      where: { id },
      include: {
        wallet: true,
        rentals: {
          where: { status: 'active' },
          select: { id: true },
        },
      },
    });

    if (!item) return null;

    return {
      id: item.id,
      name: item.name,
      phone: item.phone,
      email: item.email,
      role: item.role,
      trustTier: item.trustTier,
      kycStatus: item.kycStatus,
      isActive: item.isActive,
      walletBalance: item.wallet?.balance ?? 0,
      walletFrozenAmount: item.wallet?.frozenAmount ?? 0,
      activeRentalCount: item.rentals.length,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      primaryAuthMethod: item.primaryAuthMethod,
      kycVerifiedAt: item.kycVerifiedAt,
    };
  }

  async findRentals(params: {
    page: number;
    limit: number;
    status?: 'active' | 'completed' | 'overdue' | 'cancelled';
    query?: string;
  }): Promise<{ data: AdminRentalListItem[]; total: number }> {
    const skip = (params.page - 1) * params.limit;
    const where = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.query
        ? {
            OR: [
              {
                user: {
                  name: {
                    contains: params.query,
                    mode: 'insensitive' as const,
                  },
                },
              },
              {
                user: {
                  phone: {
                    contains: params.query,
                    mode: 'insensitive' as const,
                  },
                },
              },
              {
                powerBank: {
                  serialNumber: {
                    contains: params.query,
                    mode: 'insensitive' as const,
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.rental.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, phone: true } },
          powerBank: { select: { id: true, serialNumber: true } },
          startStation: { select: { id: true, name: true } },
          endStation: { select: { id: true, name: true } },
        },
        orderBy: { startedAt: 'desc' },
        take: params.limit,
        skip,
      }),
      this.prisma.rental.count({ where }),
    ]);

    return {
      data: data.map((item) => ({
        id: item.id,
        userId: item.user.id,
        userName: item.user.name,
        userPhone: item.user.phone,
        powerBankId: item.powerBank.id,
        powerBankSerialNumber: item.powerBank.serialNumber,
        startStationId: item.startStation.id,
        startStationName: item.startStation.name,
        endStationId: item.endStation?.id ?? null,
        endStationName: item.endStation?.name ?? null,
        status: item.status,
        depositAmount: item.depositAmount,
        chargeAmount: item.chargeAmount,
        startedAt: item.startedAt,
        returnedAt: item.returnedAt,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      total,
    };
  }

  async findRentalById(id: string): Promise<AdminRentalListItem | null> {
    const item = await this.prisma.rental.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, phone: true } },
        powerBank: { select: { id: true, serialNumber: true } },
        startStation: { select: { id: true, name: true } },
        endStation: { select: { id: true, name: true } },
      },
    });

    if (!item) return null;

    return {
      id: item.id,
      userId: item.user.id,
      userName: item.user.name,
      userPhone: item.user.phone,
      powerBankId: item.powerBank.id,
      powerBankSerialNumber: item.powerBank.serialNumber,
      startStationId: item.startStation.id,
      startStationName: item.startStation.name,
      endStationId: item.endStation?.id ?? null,
      endStationName: item.endStation?.name ?? null,
      status: item.status,
      depositAmount: item.depositAmount,
      chargeAmount: item.chargeAmount,
      startedAt: item.startedAt,
      returnedAt: item.returnedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  async findPowerBanks(params: {
    page: number;
    limit: number;
    status?: 'idle' | 'rented' | 'charging' | 'faulty';
    query?: string;
  }): Promise<{ data: AdminPowerBankListItem[]; total: number }> {
    const skip = (params.page - 1) * params.limit;
    const where = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.query
        ? {
            OR: [
              {
                serialNumber: {
                  contains: params.query,
                  mode: 'insensitive' as const,
                },
              },
              {
                station: {
                  name: {
                    contains: params.query,
                    mode: 'insensitive' as const,
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.powerBank.findMany({
        where,
        include: {
          station: { select: { id: true, name: true } },
          slot: { select: { id: true, slotIndex: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: params.limit,
        skip,
      }),
      this.prisma.powerBank.count({ where }),
    ]);

    return {
      data: data.map((item) => ({
        id: item.id,
        serialNumber: item.serialNumber,
        status: item.status,
        chargeLevel: item.chargeLevel,
        stationId: item.station?.id ?? item.stationId,
        stationName: item.station?.name ?? null,
        slotId: item.slot?.id ?? null,
        slotIndex: item.slot?.slotIndex ?? null,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      total,
    };
  }

  async findPowerBankById(id: string): Promise<AdminPowerBankListItem | null> {
    const item = await this.prisma.powerBank.findUnique({
      where: { id },
      include: {
        station: { select: { id: true, name: true } },
        slot: { select: { id: true, slotIndex: true } },
      },
    });

    if (!item) return null;

    return {
      id: item.id,
      serialNumber: item.serialNumber,
      status: item.status,
      chargeLevel: item.chargeLevel,
      stationId: item.station?.id ?? item.stationId,
      stationName: item.station?.name ?? null,
      slotId: item.slot?.id ?? null,
      slotIndex: item.slot?.slotIndex ?? null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
