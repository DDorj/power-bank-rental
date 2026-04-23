import { jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { AdminRepository } from '../admin.repository.js';
import { AdminService } from '../admin.service.js';

describe('AdminService', () => {
  let service: AdminService;
  let repo: jest.Mocked<AdminRepository>;
  let config: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: AdminRepository,
          useValue: {
            getOverviewSnapshot: jest.fn(),
            findPayments: jest.fn(),
            findPaymentById: jest.fn(),
            findWalletTransactions: jest.fn(),
            findUsers: jest.fn(),
            findUserById: jest.fn(),
            findRentals: jest.fn(),
            findRentalById: jest.fn(),
            findPowerBanks: jest.fn(),
            findPowerBankById: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'MQTT_URL') return 'mqtt://localhost:1883';
              if (key === 'MQTT_HEARTBEAT_TIMEOUT_MS') return 90_000;
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(AdminService);
    repo = module.get(AdminRepository);
    config = module.get(ConfigService);
  });

  it('builds dashboard overview with online and offline cabinet counts', async () => {
    repo.getOverviewSnapshot.mockResolvedValue({
      users: {
        total: 5,
        active: 4,
        admins: 1,
        kycVerified: 2,
      },
      stations: {
        total: 3,
        active: 2,
        inactive: 1,
        maintenance: 0,
        totalSlots: 24,
        availablePowerBanks: 7,
        records: [
          {
            mqttDeviceId: 'cabinet-1',
            lastHeartbeatAt: new Date(),
          },
          {
            mqttDeviceId: 'cabinet-2',
            lastHeartbeatAt: new Date(Date.now() - 180_000),
          },
          {
            mqttDeviceId: null,
            lastHeartbeatAt: null,
          },
        ],
      },
      rentals: {
        active: 1,
        completed: 10,
        overdue: 0,
        completedToday: 2,
      },
      payments: {
        pendingInvoices: 1,
        paidToday: 2,
        totalTopupAmount: 15000,
      },
      wallet: {
        totalBalance: 25000,
        totalFrozenAmount: 3000,
      },
    });

    const result = await service.getDashboardOverview();

    expect(result.stations.online).toBe(1);
    expect(result.stations.offline).toBe(1);
    expect(result.users.total).toBe(5);
    expect(result.generatedAt).toEqual(expect.any(String));
  });

  it('returns zero online/offline counts when MQTT is disabled', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'MQTT_URL') return undefined;
      if (key === 'MQTT_HEARTBEAT_TIMEOUT_MS') return 90_000;
      return undefined;
    });
    repo.getOverviewSnapshot.mockResolvedValue({
      users: {
        total: 0,
        active: 0,
        admins: 0,
        kycVerified: 0,
      },
      stations: {
        total: 1,
        active: 1,
        inactive: 0,
        maintenance: 0,
        totalSlots: 8,
        availablePowerBanks: 4,
        records: [
          {
            mqttDeviceId: 'cabinet-1',
            lastHeartbeatAt: new Date(),
          },
        ],
      },
      rentals: {
        active: 0,
        completed: 0,
        overdue: 0,
        completedToday: 0,
      },
      payments: {
        pendingInvoices: 0,
        paidToday: 0,
        totalTopupAmount: 0,
      },
      wallet: {
        totalBalance: 0,
        totalFrozenAmount: 0,
      },
    });

    const result = await service.getDashboardOverview();

    expect(result.stations.online).toBe(0);
    expect(result.stations.offline).toBe(0);
  });

  it('delegates payment list lookup to repository', async () => {
    repo.findPayments.mockResolvedValue({
      data: [
        {
          id: 'invoice-1',
          userId: 'user-1',
          userName: 'Admin Demo',
          userPhone: '+97699000001',
          transactionId: 'topup-1',
          invoiceId: 'INV-1',
          amount: 5000,
          purpose: 'topup',
          status: 'paid',
          followUpLink: 'https://example.mn',
          expiresAt: new Date(),
          paidAt: new Date(),
          paymentTransactionId: 'payment-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      total: 1,
    });

    const result = await service.getPayments({
      page: 1,
      limit: 20,
      status: 'paid',
    });

    expect(repo.findPayments).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      status: 'paid',
    });
    expect(result.total).toBe(1);
  });

  it('returns payment detail from repository', async () => {
    repo.findPaymentById.mockResolvedValue({
      id: 'invoice-1',
      userId: 'user-1',
      userName: 'Admin Demo',
      userPhone: '+97699000001',
      transactionId: 'topup-1',
      invoiceId: 'INV-1',
      amount: 5000,
      purpose: 'topup',
      status: 'paid',
      followUpLink: 'https://example.mn',
      expiresAt: new Date(),
      paidAt: new Date(),
      paymentTransactionId: 'payment-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      webhookEvents: [
        {
          id: 'event-1',
          transactionId: 'topup-1',
          eventType: 'payment',
          receivedAt: new Date(),
          processedAt: new Date(),
        },
      ],
    });

    const result = await service.getPaymentById('invoice-1');

    expect(repo.findPaymentById).toHaveBeenCalledWith('invoice-1');
    expect(result.webhookEvents).toHaveLength(1);
  });

  it('delegates wallet transaction list lookup to repository', async () => {
    repo.findWalletTransactions.mockResolvedValue({
      data: [
        {
          id: 'tx-1',
          walletId: 'wallet-1',
          userId: 'user-1',
          userName: 'Saraa User',
          userPhone: '+97699000003',
          type: 'charge',
          amount: 3000,
          balanceAfter: 12000,
          frozenAfter: 0,
          referenceId: 'rental-1',
          description: 'Түрээсийн төлбөр',
          createdAt: new Date(),
        },
      ],
      total: 1,
    });

    const result = await service.getWalletTransactions({
      page: 1,
      limit: 20,
      type: 'charge',
      userId: 'user-1',
    });

    expect(repo.findWalletTransactions).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      type: 'charge',
      userId: 'user-1',
    });
    expect(result.total).toBe(1);
  });

  it('delegates admin user list lookup to repository', async () => {
    repo.findUsers.mockResolvedValue({
      data: [],
      total: 0,
    });

    await service.getUsers({ page: 1, limit: 20, role: 'user', query: '9900' });

    expect(repo.findUsers).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      role: 'user',
      query: '9900',
    });
  });

  it('returns admin user detail from repository', async () => {
    repo.findUserById.mockResolvedValue({
      id: 'user-1',
      name: 'Admin Demo',
      phone: '+97699000001',
      email: null,
      role: 'admin',
      trustTier: 3,
      kycStatus: 'verified',
      isActive: true,
      walletBalance: 0,
      walletFrozenAmount: 0,
      activeRentalCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      primaryAuthMethod: 'phone_otp',
      kycVerifiedAt: new Date(),
    });

    const result = await service.getUserById('user-1');
    expect(repo.findUserById).toHaveBeenCalledWith('user-1');
    expect(result.role).toBe('admin');
  });

  it('delegates admin rental list lookup to repository', async () => {
    repo.findRentals.mockResolvedValue({
      data: [],
      total: 0,
    });

    await service.getRentals({
      page: 1,
      limit: 20,
      status: 'active',
      query: 'PB-DEMO',
    });

    expect(repo.findRentals).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      status: 'active',
      query: 'PB-DEMO',
    });
  });

  it('returns admin rental detail from repository', async () => {
    repo.findRentalById.mockResolvedValue({
      id: 'rental-1',
      userId: 'user-1',
      userName: 'Saraa User',
      userPhone: '+97699000003',
      powerBankId: 'pb-1',
      powerBankSerialNumber: 'PB-DEMO-001',
      startStationId: 'station-1',
      startStationName: 'Shangri-La Mall',
      endStationId: null,
      endStationName: null,
      status: 'active',
      depositAmount: 3000,
      chargeAmount: null,
      startedAt: new Date(),
      returnedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.getRentalById('rental-1');
    expect(repo.findRentalById).toHaveBeenCalledWith('rental-1');
    expect(result.powerBankSerialNumber).toBe('PB-DEMO-001');
  });

  it('delegates admin power bank list lookup to repository', async () => {
    repo.findPowerBanks.mockResolvedValue({
      data: [],
      total: 0,
    });

    await service.getPowerBanks({
      page: 1,
      limit: 20,
      status: 'idle',
      query: 'Shangri',
    });

    expect(repo.findPowerBanks).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      status: 'idle',
      query: 'Shangri',
    });
  });

  it('returns admin power bank detail from repository', async () => {
    repo.findPowerBankById.mockResolvedValue({
      id: 'pb-1',
      serialNumber: 'PB-DEMO-001',
      status: 'idle',
      chargeLevel: 92,
      stationId: 'station-1',
      stationName: 'Shangri-La Mall',
      slotId: 'slot-1',
      slotIndex: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.getPowerBankById('pb-1');
    expect(repo.findPowerBankById).toHaveBeenCalledWith('pb-1');
    expect(result.stationName).toBe('Shangri-La Mall');
  });
});
