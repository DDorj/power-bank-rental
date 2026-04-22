import { jest } from '@jest/globals';
import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

jest.mock('../../../common/prisma/prisma.service', () => ({
  PrismaService: jest.fn(),
}));

import { RedisService } from '../../../common/redis/redis.service.js';
import { WalletService } from '../../wallet/wallet.service.js';
import { BonumProvider } from '../bonum/bonum.provider.js';
import { PaymentsRepository } from '../payments.repository.js';
import { PaymentsService } from '../payments.service.js';

const mockInvoice: BonumInvoiceRecord = {
  id: 'invoice-uuid-1',
  userId: 'user-uuid-1',
  transactionId: 'topup-order-1',
  invoiceId: 'INV-123',
  amount: 5000,
  purpose: 'topup',
  status: 'pending',
  followUpLink: 'https://ecommerce.bonum.mn/ecommerce?invoiceId=INV-123',
  expiresAt: new Date('2026-04-22T11:00:00.000Z'),
  paidAt: null,
  paymentTransactionId: null,
  createdAt: new Date('2026-04-22T10:55:00.000Z'),
  updatedAt: new Date('2026-04-22T10:55:00.000Z'),
};

describe('PaymentsService', () => {
  let service: PaymentsService;
  let repo: jest.Mocked<PaymentsRepository>;
  let bonum: jest.Mocked<BonumProvider>;
  let walletService: jest.Mocked<WalletService>;
  let redis: jest.Mocked<RedisService>;

  const release = jest.fn().mockResolvedValue(undefined);

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: PaymentsRepository,
          useValue: {
            createBonumInvoice: jest.fn(),
            findBonumInvoiceByTransactionId: jest.fn(),
            findBonumInvoiceByInvoiceId: jest.fn(),
            findBonumInvoiceByTransactionIdForUser: jest.fn(),
            createBonumWebhookEvent: jest.fn(),
            findBonumInvoiceByIdInTx: jest.fn(),
            updateBonumInvoiceStatusInTx: jest.fn(),
            markWebhookProcessedInTx: jest.fn(),
            $transaction: jest.fn(),
          },
        },
        {
          provide: BonumProvider,
          useValue: {
            createInvoice: jest.fn(),
            verifyWebhook: jest.fn(),
          },
        },
        {
          provide: WalletService,
          useValue: {
            applyInExistingTx: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            acquireLock: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'BONUM_CALLBACK_URL') {
                return 'https://api.example.mn/api/v1/payments/bonum/callback';
              }
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(PaymentsService);
    repo = module.get(PaymentsRepository);
    bonum = module.get(BonumProvider);
    walletService = module.get(WalletService);
    redis = module.get(RedisService);

    redis.acquireLock.mockResolvedValue(release);
    repo.$transaction.mockImplementation(async (fn) => fn({} as never));
  });

  it('creates Bonum topup invoice and persists it', async () => {
    bonum.createInvoice.mockResolvedValue({
      invoiceId: 'INV-123',
      followUpLink: mockInvoice.followUpLink,
      expiresAt: new Date('2026-04-22T11:00:00.000Z'),
    });
    repo.createBonumInvoice.mockResolvedValue(mockInvoice);

    expect(bonum.createInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 5000,
        transactionId: expect.stringMatching(/^topup-/),
        callbackUrl: 'https://api.example.mn/api/v1/payments/bonum/callback',
      }),
    );
    await expect(
      service.createWalletTopupInvoice('user-uuid-1', 5000),
    ).resolves.toEqual(mockInvoice);
  });

  it('rejects webhook when checksum is invalid', async () => {
    bonum.verifyWebhook.mockReturnValue(false);

    await expect(
      service.processBonumWebhook(
        {
          type: 'PAYMENT',
          status: 'SUCCESS',
          body: {
            invoiceId: 'INV-123',
            transactionId: 'topup-order-1',
          },
        },
        'bad-checksum',
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('processes paid webhook and tops up wallet', async () => {
    bonum.verifyWebhook.mockReturnValue(true);
    repo.findBonumInvoiceByInvoiceId.mockResolvedValue(mockInvoice);
    repo.createBonumWebhookEvent.mockResolvedValue({
      id: 'event-uuid-1',
      transactionId: 'topup-order-1',
      invoiceId: mockInvoice.id,
      eventType: 'payment',
      payload: {},
      signature: 'checksum',
      receivedAt: new Date(),
      processedAt: null,
    });
    repo.findBonumInvoiceByIdInTx.mockResolvedValue(mockInvoice);
    repo.updateBonumInvoiceStatusInTx.mockResolvedValue({
      ...mockInvoice,
      status: 'paid',
      paidAt: new Date('2026-04-22T11:00:00.000Z'),
      paymentTransactionId: 'topup-order-1',
    });
    repo.markWebhookProcessedInTx.mockResolvedValue({
      id: 'event-uuid-1',
      transactionId: 'topup-order-1',
      invoiceId: mockInvoice.id,
      eventType: 'payment',
      payload: {},
      signature: 'checksum',
      receivedAt: new Date(),
      processedAt: new Date(),
    });
    walletService.applyInExistingTx.mockResolvedValue({} as never);

    const result = await service.processBonumWebhook(
      {
        type: 'PAYMENT',
        status: 'SUCCESS',
        message: 'Successful',
        body: {
          invoiceId: 'INV-123',
          transactionId: 'topup-order-1',
          amount: 5000,
          completedAt: '2026-04-22 11:00:00',
          status: 'PAID',
        },
      },
      'valid-checksum',
    );

    expect(redis.acquireLock).toHaveBeenCalledWith('wallet:user-uuid-1', 5000);
    expect(walletService.applyInExistingTx).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        userId: 'user-uuid-1',
        type: 'topup',
        amount: 5000,
        referenceId: 'invoice-uuid-1',
      }),
    );
    expect(release).toHaveBeenCalled();
    expect(result).toMatchObject({
      received: true,
      duplicate: false,
      processed: true,
      transactionId: 'topup-order-1',
      invoiceStatus: 'paid',
    });
  });

  it('returns duplicate when webhook transaction is already recorded', async () => {
    bonum.verifyWebhook.mockReturnValue(true);
    repo.findBonumInvoiceByInvoiceId.mockResolvedValue({
      ...mockInvoice,
      status: 'paid',
    });
    repo.createBonumWebhookEvent.mockRejectedValue({ code: 'P2002' });

    const result = await service.processBonumWebhook(
      {
        type: 'PAYMENT',
        status: 'SUCCESS',
        body: {
          invoiceId: 'INV-123',
          transactionId: 'topup-order-1',
          amount: 5000,
          completedAt: '2026-04-22 11:00:00',
          status: 'PAID',
        },
      },
      'valid-checksum',
    );

    expect(walletService.applyInExistingTx).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      received: true,
      duplicate: true,
      processed: false,
      invoiceStatus: 'paid',
    });
  });

  it('marks invoice expired without topping up wallet', async () => {
    bonum.verifyWebhook.mockReturnValue(true);
    repo.findBonumInvoiceByTransactionId.mockResolvedValue(mockInvoice);
    repo.createBonumWebhookEvent.mockResolvedValue({
      id: 'event-uuid-2',
      transactionId: 'topup-order-1',
      invoiceId: mockInvoice.id,
      eventType: 'payment',
      payload: {},
      signature: 'checksum',
      receivedAt: new Date(),
      processedAt: null,
    });
    repo.updateBonumInvoiceStatusInTx.mockResolvedValue({
      ...mockInvoice,
      status: 'expired',
    });
    repo.markWebhookProcessedInTx.mockResolvedValue({
      id: 'event-uuid-2',
      transactionId: 'topup-order-1',
      invoiceId: mockInvoice.id,
      eventType: 'payment',
      payload: {},
      signature: 'checksum',
      receivedAt: new Date(),
      processedAt: new Date(),
    });

    const result = await service.processBonumWebhook(
      {
        type: 'PAYMENT',
        status: 'FAILED',
        body: {
          transactionId: 'topup-order-1',
          invoiceStatus: 'EXPIRED',
          updatedAt: 1769657291559,
        },
      },
      'valid-checksum',
    );

    expect(walletService.applyInExistingTx).not.toHaveBeenCalled();
    expect(result.invoiceStatus).toBe('expired');
  });

  it('throws when invoice is not found', async () => {
    bonum.verifyWebhook.mockReturnValue(true);
    repo.findBonumInvoiceByInvoiceId.mockResolvedValue(null);
    repo.findBonumInvoiceByTransactionId.mockResolvedValue(null);

    await expect(
      service.processBonumWebhook(
        {
          type: 'PAYMENT',
          status: 'SUCCESS',
          body: {
            invoiceId: 'INV-404',
            transactionId: 'topup-order-404',
          },
        },
        'valid-checksum',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws when webhook payload is incomplete', async () => {
    bonum.verifyWebhook.mockReturnValue(true);

    await expect(
      service.processBonumWebhook(
        {
          type: 'PAYMENT',
          status: 'SUCCESS',
          body: {},
        },
        'valid-checksum',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws when callback url is missing', async () => {
    const module = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: PaymentsRepository,
          useValue: repo,
        },
        {
          provide: BonumProvider,
          useValue: bonum,
        },
        {
          provide: WalletService,
          useValue: walletService,
        },
        {
          provide: RedisService,
          useValue: redis,
        },
        {
          provide: ConfigService,
          useValue: {
            get: () => undefined,
          },
        },
      ],
    }).compile();

    const serviceWithoutCallback = module.get(PaymentsService);

    await expect(
      serviceWithoutCallback.createWalletTopupInvoice('user-uuid-1', 5000),
    ).rejects.toThrow(BadRequestException);
  });
});
