import { jest } from '@jest/globals';
import { createHmac } from 'crypto';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { BonumProvider } from '../bonum.provider.js';

function mockJsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as Response;
}

describe('BonumProvider', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('verifies webhook checksum using HMAC-SHA256', async () => {
    const payload = {
      type: 'PAYMENT',
      status: 'SUCCESS',
      body: {
        invoiceId: 'INV-123',
        transactionId: 'topup-order-1',
      },
    };
    const body = JSON.stringify(payload);
    const checksum = createHmac('sha256', 'checksum-secret')
      .update(body)
      .digest('hex');

    const module = await Test.createTestingModule({
      providers: [
        BonumProvider,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              key === 'BONUM_MERCHANT_CHECKSUM_KEY'
                ? 'checksum-secret'
                : undefined,
          },
        },
      ],
    }).compile();

    const provider = module.get(BonumProvider);

    expect(provider.verifyWebhook(payload, checksum, Buffer.from(body))).toBe(
      true,
    );
    expect(provider.verifyWebhook(payload, 'wrong-checksum', Buffer.from(body))).toBe(
      false,
    );
  });

  it('creates all-in-one invoice using Bonum auth and invoice endpoints', async () => {
    const fetchMock = jest.fn<typeof fetch>();
    fetchMock
      .mockResolvedValueOnce(
        mockJsonResponse({
          tokenType: 'Bearer',
          accessToken: 'access-token',
          expiresIn: 1800,
          refreshToken: 'refresh-token',
          refreshExpiresIn: 2000,
          unit: 'SECONDS',
        }),
      )
      .mockResolvedValueOnce(
        mockJsonResponse({
          invoiceId: 'INV-123',
          followUpLink: 'https://ecommerce.bonum.mn/ecommerce?invoiceId=INV-123',
        }),
      );
    global.fetch = fetchMock;

    const module = await Test.createTestingModule({
      providers: [
        BonumProvider,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              switch (key) {
                case 'BONUM_BASE_URL':
                  return 'https://testapi.bonum.mn';
                case 'BONUM_APP_SECRET':
                  return 'app-secret';
                case 'BONUM_TERMINAL_ID':
                  return '17171119';
                case 'BONUM_INVOICE_EXPIRES_IN':
                  return 600;
                default:
                  return undefined;
              }
            },
          },
        },
      ],
    }).compile();

    const provider = module.get(BonumProvider);
    const result = await provider.createInvoice({
      transactionId: 'topup-order-1',
      amount: 5000,
      callbackUrl: 'https://api.example.mn/api/v1/payments/bonum/callback',
    });

    const [authUrl, authInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const [invoiceUrl, invoiceInit] = fetchMock.mock.calls[1] as [
      string,
      RequestInit,
    ];

    expect(authUrl).toBe(
      'https://testapi.bonum.mn/bonum-gateway/ecommerce/auth/create',
    );
    expect(authInit.method).toBe('GET');
    expect(authInit.headers).toMatchObject({
      Authorization: 'AppSecret app-secret',
      'X-TERMINAL-ID': '17171119',
    });

    expect(invoiceUrl).toBe(
      'https://testapi.bonum.mn/bonum-gateway/ecommerce/invoices',
    );
    expect(invoiceInit.method).toBe('POST');
    expect(invoiceInit.headers).toMatchObject({
      Authorization: 'Bearer access-token',
      'Content-Type': 'application/json',
    });
    expect(invoiceInit.body).toBe(
      JSON.stringify({
        amount: 5000,
        callback: 'https://api.example.mn/api/v1/payments/bonum/callback',
        transactionId: 'topup-order-1',
        expiresIn: 600,
      }),
    );
    expect(result).toMatchObject({
      invoiceId: 'INV-123',
      followUpLink: 'https://ecommerce.bonum.mn/ecommerce?invoiceId=INV-123',
    });
  });

  it('throws BONUM_NOT_CONFIGURED when required Bonum config is missing', async () => {
    const module = await Test.createTestingModule({
      providers: [
        BonumProvider,
        {
          provide: ConfigService,
          useValue: {
            get: () => undefined,
          },
        },
      ],
    }).compile();

    const provider = module.get(BonumProvider);

    await expect(
      provider.createInvoice({
        transactionId: 'topup-order-1',
        amount: 5000,
        callbackUrl: 'https://api.example.mn/api/v1/payments/bonum/callback',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
