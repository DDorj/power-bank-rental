---
description: Payment & wallet rules — Bonum QR pay, wallet pre-load model
paths:
  - "src/modules/payments/**"
  - "src/modules/wallet/**"
---

# Payment & Wallet

> Архитектур: `PAYMENT.md` (project root)

## Үндсэн зарчим

1. Bonum-д native card hold байхгүй → **wallet pre-load** загвар
2. `wallet.balance` шууд UPDATE **хориотой** — `WalletService.applyTransaction()` л
3. **Redis lock + DB transaction** wallet mutation бүхэн
4. Webhook **idempotency** — `bonum_webhook_events` unique constraint
5. Currency = **MNT integer** (decimal/float биш)

## Wallet transaction (заавал)

```typescript
// ✗
await this.prisma.wallet.update({ where: { userId }, data: { balance: { increment: amount } } })

// ✓
await this.walletService.applyTransaction({
  userId, type: 'topup', amount: +10000,
  referenceType: 'bonum_invoice', referenceId: invoice.id,
})
```

`applyTransaction` дотор:
1. Redis lock `wallet:${userId}` (ttl 5s, retry 3)
2. `prisma.$transaction`
3. `SELECT ... FOR UPDATE`
4. Constraint check (`balance >= 0`, `frozen <= balance`)
5. `wallets` update + `wallet_transactions` insert
6. Lock суллах

## Frozen amount (soft hold)

```typescript
// Rental эхлэх
{ type: 'freeze',   amount: -3000 }  // frozen_amount өсгөх (balance хөндөхгүй)

// Rental буцаах — нэг $transaction-д ороох
await this.prisma.$transaction(async (tx) => {
  await this.walletService.applyInTx(tx, { type: 'charge',   amount: -actualCost })
  await this.walletService.applyInTx(tx, { type: 'unfreeze', amount: +3000 })
  await this.rentalRepo.updateStatus(tx, rentalId, 'completed')
})
```

## Bonum webhook handler

```typescript
@Controller('payments/bonum')
export class BonumWebhookController {
  @Post('callback') @Public()
  async handle(@RawBody() rawBody: Buffer, @Headers('x-signature') sig: string) {
    // 1. Verify (security.md үзнэ — raw body, timing-safe)
    if (!this.bonum.verifyWebhook(rawBody.toString(), sig))
      throw new UnauthorizedException('Invalid signature')

    const payload = JSON.parse(rawBody.toString())

    // 2. Idempotency — unique constraint
    try {
      await this.prisma.bonumWebhookEvent.create({
        data: { transactionId: payload.transactionId, payload, ... },
      })
    } catch (e) {
      if (e.code === 'P2002') return { success: true, data: { alreadyProcessed: true } }
      throw e
    }

    // 3. Process
    await this.processPayment(payload)
    return { success: true, data: { processed: true } }
  }
}
```

## PaymentProvider interface (заавал)

```typescript
export interface PaymentProvider {
  readonly name: 'bonum' | 'socialpay' | 'mock'
  createInvoice(params: CreateInvoiceParams): Promise<InvoiceResult>
  verifyWebhook(rawBody: string, signature: string): boolean
  getInvoiceStatus(invoiceId: string): Promise<InvoiceStatus>
  refund(transactionId: string, amount: number): Promise<RefundResult>
}
```

Bonum SDK-г rental/wallet service-ээс **шууд дуудахгүй** — interface-ээр л. Тест дээр `MockProvider`.

## Cron Jobs

| Cron | Давтамж | Үүрэг |
|---|---|---|
| `pending-invoice-poll` | 5 мин | Bonum pending invoice статус (webhook fallback) |
| `expired-invoice-cleanup` | 10 мин | Хугацаа хэтэрсэн → `expired` |
| `overdue-rental-warning` | 1 цаг | 24h+ overdue → email/SMS |
| `overdue-rental-charge` | 6 цаг | 72h+ overdue → power bank үнэ wallet-аас |
| `daily-reconciliation` | 1 өдөр | Bonum settlement vs internal ledger |

`@Cron` + `@Injectable()`, тест fake timers-аар.

## Refund

Бүгд **admin approval-тэй**:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN)
@Post('refunds/:id/approve')
async approve(@Param('id') refundId: string) {
  const refund = await this.refundService.approve(refundId)
  await this.paymentProvider.refund(refund.originalTransactionId, refund.amount)
  await this.walletService.applyTransaction({
    userId: refund.userId, type: 'refund', amount: -refund.amount,
    referenceType: 'refund', referenceId: refund.id,
  })
}
```

## Хориотой

- `UPDATE wallets SET balance = ...` шууд (CI ESLint rule)
- Float/decimal currency
- Bonum SDK rental/wallet service-ээс шууд
- Webhook handler parsed body-оор signature шалгах (raw body заавал)
- Refund auto-approve

## Agent

Wallet/payment код өөрчлөхийн өмнө + дараа `bonum-payment-expert`.
