# Power Bank Rental — Payment Architecture

> **Огноо:** 2026-04-21
> **Зорилго:** Bonum QR pay (зөвхөн QR pay) ашиглан барьцаа hold-ийг загварчилж, rental төлбөрийн систем зохион байгуулах архитектур.

---

## 1. Authorization Hold-ийн ойлголт

### 1.1 Картын стандарт төлбөр

Картын стандарт төлбөрийн систем хоёр алхамтай:

```
[1] AUTHORIZE (hold)  →  [2] CAPTURE (бодит татах)
```

- **Authorize:** банк картаас тодорхой дүнг "түр царцаах" — мөнгө хэрэглэгчийн данснаас гарахгүй ч **available balance**-аас хасагдана
- **Capture:** үйлчилгээ гүйцэтгэгдсэний дараа л бодит татах
- **Void/Release:** Capture хийхгүйгээр царцаасныг буцааж чөлөөлөх

### 1.2 Жишээ

Зочид буудал check-in хийхэд $200 hold тавьдаг. Хэрэглэгч minibar-аас юу ч ашиглахгүй check-out хийвэл $200 чөлөөлөгдөж, картанд буцаагүй.

### 1.3 Барьцаанд яагаад тохиромжтой вэ

Power bank түрээслэхэд жинхэнэ мөнгө гар солихгүй, харин хэрэглэгч "буцааж өгөхгүй бол энэ мөнгийг авна" гэдэг гэрээ үүсгэдэг.

---

## 2. QR pay-д Hold байхгүй яагаад вэ?

QR pay (Bonum, QPay, SocialPay бүгд адил) нь **банкны апп-руу redirect** хэлбэрээр ажилладаг:

```
Хэрэглэгч QR scan
  → Банкны апп нээгдэнэ
  → Confirm дарна
  → Мөнгө шууд А данснаас Б данс руу шилжинэ (real-time settlement)
  → Backend webhook авна
```

Энд `Authorize` гэдэг үе шат **байхгүй** — settle нэг алхамаар л болдог. Тиймээс "hold" гэж байхгүй, **зөвхөн "төлбөр авч + дараа нь буцаах"** гэсэн загвар үлддэг.

---

## 3. Барьцаа загварлах хувилбарууд

| Хувилбар | Хэрхэн ажиллах вэ | UX | Эрсдэл |
|---|---|---|---|
| **A. Бодит барьцаа** | Хэрэглэгчээс ₮5,000 авч, буцаахад ₮5,000 + цэнэгийн төлбөр буцаах эсвэл хасах | Бодит мөнгө гар солино — хэрэглэгчид сэтгэл зовох | Refund 1–3 хоног → CX гомдол |
| **B. Wallet pre-load** | Хэрэглэгч апп дээр ₮10,000 ачаалж wallet үүсгэнэ. Rental тус бүр wallet-аас хасагдана | Smooth UX, нэг л удаа QR scan | Wallet refund лог, accounting нийлэг |
| **C. Card-on-file** | Bonum card hold ашиглана | Хамгийн жигд | QR pay-ээр БОЛОХГҮЙ |

**Сонгосон загвар:** **B (Wallet pre-load)** — power bank rental-ын дахин дахин хэрэглэгчдэд хамгийн тохиромжтой UX.

---

## 4. Wallet Pre-load Architecture

### 4.1 Анхны wallet ачаалах flow

```
┌──────────────────────────────────────────────────────────────┐
│  Хэрэглэгчийн анхны бүртгэл:                                 │
│  1. Google/OTP-аар нэвтрэнэ                                   │
│  2. "Wallet ачаалах" UX — ₮5,000 / ₮10,000 / ₮20,000 сонгоно  │
│  3. Bonum QR гарна → банкны апп-аар төлнө                     │
│  4. Webhook ирнэ → wallet.balance += amount                   │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 Rental эхлэх flow

```
┌──────────────────────────────────────────────────────────────┐
│  Power bank rental эхлэх үед:                                 │
│  1. Хэрэглэгч cabinet QR scan                                 │
│  2. Backend wallet.balance-г шалгана                          │
│      ├── balance >= ₮3,000 (минимум hold) → үргэлжлүүлнэ     │
│      └── balance < ₮3,000 → "Wallet ачаалах" UX               │
│  3. wallet.balance дотор ₮3,000 "soft hold" тавих             │
│      (frozen_amount += 3,000)                                 │
│  4. IoT cabinet-руу slot release команд                       │
│  5. Rental "active" төлвөнд орно                              │
└──────────────────────────────────────────────────────────────┘
```

### 4.3 Rental буцаах flow

```
┌──────────────────────────────────────────────────────────────┐
│  Power bank буцаах үед:                                       │
│  1. Хэрэглэгч өөр cabinet-д буцаалт хийнэ                     │
│  2. Cabinet IoT-ээр backend-д мэдэгдэнэ                       │
│  3. Backend rental хугацааг тооцоолно                         │
│      duration = return_time - start_time                      │
│      cost = ceil(duration / hour) × ₮1,500                    │
│  4. wallet-ээс бодит дүнг хасна                               │
│      wallet.balance -= cost                                   │
│      wallet.frozen_amount -= 3,000                            │
│  5. Rental "completed" төлвөнд орно                           │
│  6. Хэрэглэгчид баримт email явуулна                          │
└──────────────────────────────────────────────────────────────┘
```

### 4.4 Overdue/timeout flow

```
┌──────────────────────────────────────────────────────────────┐
│  Power bank буцаагаагүй (timeout) үед:                        │
│  1. Cron job: 24+ цаг overdue rental-ийг сканнердана          │
│  2. Email/SMS warning явуулна                                 │
│  3. 72 цаг дараа: power bank-ийн бүрэн үнэ wallet-аас хасна   │
│      wallet.balance -= ₮25,000 (power bank үнэ)               │
│      ├── wallet хүрэхгүй бол: дараагийн pre-load-оос автомат  │
│      └── эсвэл хэрэглэгчийг "blocked" төлвөнд оруулна         │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. Database Schema

### 5.1 Wallet table

```sql
wallets
  ├── id (uuid, pk)
  ├── user_id (fk → users, unique)
  ├── balance              -- бодит үлдэгдэл (₮)
  ├── frozen_amount        -- идэвхтэй rental-ын soft hold
  ├── available_balance    -- generated: balance - frozen_amount
  ├── created_at
  └── updated_at
```

### 5.2 Wallet transactions table

```sql
wallet_transactions
  ├── id (uuid, pk)
  ├── wallet_id (fk → wallets)
  ├── type                 -- topup | rental_charge | refund | penalty | freeze | unfreeze
  ├── amount               -- + topup, - charge гэх мэт (signed)
  ├── balance_after
  ├── reference_type       -- rental | bonum_invoice | manual
  ├── reference_id
  ├── metadata (jsonb)
  └── created_at

  INDEX (wallet_id, created_at DESC)
  INDEX (reference_type, reference_id)
```

### 5.3 Bonum invoices table

```sql
bonum_invoices
  ├── id (uuid, pk)
  ├── user_id (fk → users)
  ├── order_id             -- our internal order id (unique)
  ├── bonum_invoice_id     -- Bonum side id
  ├── amount
  ├── purpose              -- topup | direct_payment
  ├── status               -- pending | paid | failed | expired
  ├── qr_text
  ├── expires_at
  ├── paid_at (nullable)
  ├── transaction_id (nullable)  -- Bonum transaction id
  └── created_at

  UNIQUE (order_id)
  UNIQUE (bonum_invoice_id)
```

### 5.4 Webhook events table (idempotency)

```sql
bonum_webhook_events
  ├── id (uuid, pk)
  ├── transaction_id       -- Bonum transactionId (UNIQUE)
  ├── invoice_id (fk → bonum_invoices)
  ├── event_type           -- payment | refund
  ├── payload (jsonb)
  ├── signature
  ├── processed_at (nullable)
  └── received_at

  UNIQUE (transaction_id)
```

### 5.5 Чухал зарчим

- Wallet balance-ийг хэзээ ч "шууд UPDATE" хийхгүй
- Бүх өөрчлөлт `wallet_transactions`-д лог болно
- Redis distributed lock + DB transaction-аар ороож хийнэ
- Generated column `available_balance`-аар race-free шалгалт

---

## 6. Bonum QR Payment Integration

### 6.1 Wallet topup invoice үүсгэх

```http
POST https://psp.bonum.mn/api/invoice/create
Content-Type: application/json

{
  "merchantId": "{{BONUM_MERCHANT_ID}}",
  "amount": 10000,
  "currency": "MNT",
  "orderId": "topup-uuid-123",
  "description": "Power Bank wallet topup",
  "callbackUrl": "https://api.example.mn/payments/bonum/callback"
}

Headers:
  X-Signature: HMAC-SHA256(body, BONUM_MERCHANT_KEY)
```

**Response:**

```json
{
  "invoiceId": "INV-...",
  "qrText": "0002010102...",
  "qrImage": "data:image/png;base64,...",
  "deepLinkUrls": {
    "khan": "khanbank://q?...",
    "golomt": "golomt://q?...",
    "tdb": "tdbm://q?...",
    "state": "statebankmongolia://q?..."
  },
  "expiresAt": "2026-04-21T15:00:00Z"
}
```

### 6.2 Backend хийх ажил

1. Bonum-аас invoice үүсгүүлнэ
2. `bonum_invoices` table-д хадгална (status = `pending`)
3. QR + deep links-ийг mobile app руу буцаана
4. Mobile app QR + "Open in bank app" товч render хийнэ

### 6.3 Webhook callback

```http
POST https://api.example.mn/payments/bonum/callback
Content-Type: application/json

{
  "invoiceId": "INV-...",
  "orderId": "topup-uuid-123",
  "status": "PAID",
  "paidAmount": 10000,
  "paidAt": "2026-04-21T14:32:11Z",
  "transactionId": "TXN-...",
  "payerInfo": {
    "bank": "khan",
    "maskedAccount": "***1234"
  }
}

Headers:
  X-Signature: HMAC-SHA256(body, BONUM_MERCHANT_KEY)
```

### 6.4 Backend webhook handler логик

1. **Verify signature** — replay attack-ийг хаах (CRITICAL)
2. **Idempotency check** — `transactionId` аль хэдийн боловсруулсан уу?
3. `bonum_invoices`-ийг `paid` төлвөнд оруулна
4. Wallet topup гүйцэтгэнэ (DB transaction-д ороож)
5. Хэрэглэгчид WebSocket-аар "Wallet ачаалагдлаа" мэдэгдэх
6. **200 OK буцаана** — амжилтгүй бол Bonum дахин retry хийнэ

---

## 7. Idempotency Implementation

Bonum нь network timeout үед нэг event-ийг **2-3 удаа** илгээж болно.

```typescript
// Pseudocode
async function handleBonumWebhook(payload, signature) {
  // Step 1: Verify signature
  if (!verifyHmac(payload, signature, BONUM_MERCHANT_KEY)) {
    throw new UnauthorizedError('Invalid signature');
  }

  // Step 2: Idempotency check via unique constraint
  try {
    await db.bonumWebhookEvents.insert({
      transactionId: payload.transactionId,
      invoiceId: payload.invoiceId,
      eventType: 'payment',
      payload: payload,
      signature: signature,
      receivedAt: new Date()
    });
  } catch (e) {
    if (e.code === 'UNIQUE_VIOLATION') {
      return { status: 'duplicate', alreadyProcessed: true };
    }
    throw e;
  }

  // Step 3: Process in transaction
  await db.transaction(async (trx) => {
    const invoice = await trx.bonumInvoices.findOneAndUpdate(
      { orderId: payload.orderId, status: 'pending' },
      { status: 'paid', paidAt: payload.paidAt, transactionId: payload.transactionId }
    );

    if (!invoice) {
      throw new InvoiceNotFoundOrAlreadyPaidError();
    }

    if (invoice.purpose === 'topup') {
      await topupWallet(trx, invoice.userId, invoice.amount);
    }

    await trx.bonumWebhookEvents.update(
      { transactionId: payload.transactionId },
      { processedAt: new Date() }
    );
  });

  // Step 4: Notify user
  await wsGateway.notifyUser(invoice.userId, 'wallet.updated');
}
```

---

## 8. Concurrency Control

### 8.1 Race condition жишээ

Хэрэглэгч хоёр rental зэрэг эхлүүлбэл frozen_amount дутаж болно.

### 8.2 Redis distributed lock

```typescript
// Pseudocode
async function freezeWalletForRental(userId, rentalId, holdAmount) {
  return await redis.lock(`wallet:${userId}`, { ttl: 5000 }, async () => {
    return await db.transaction(async (trx) => {
      const wallet = await trx.wallets.findOne({ userId, lockMode: 'FOR_UPDATE' });

      if (wallet.balance - wallet.frozen_amount < holdAmount) {
        throw new InsufficientBalanceError();
      }

      await trx.wallets.update({ userId }, {
        frozen_amount: wallet.frozen_amount + holdAmount
      });

      await trx.walletTransactions.insert({
        walletId: wallet.id,
        type: 'freeze',
        amount: -holdAmount,
        balanceAfter: wallet.balance,
        referenceType: 'rental',
        referenceId: rentalId,
      });
    });
  });
}
```

### 8.3 DB-level constraint

```sql
-- Хэрэглэгч нэг үед нэг л active rental-тай байх
CREATE UNIQUE INDEX active_rental_per_user
  ON rentals (user_id)
  WHERE status = 'active';

-- Wallet balance хэзээ ч сөрөг болохгүй
ALTER TABLE wallets
  ADD CONSTRAINT balance_non_negative CHECK (balance >= 0);

ALTER TABLE wallets
  ADD CONSTRAINT frozen_le_balance CHECK (frozen_amount <= balance);
```

---

## 9. Refund (буцаалт) загвар

| Тохиолдол | Үйлдэл |
|---|---|
| Хэрэглэгч rental эхлүүлсэн ч cabinet нээгдээгүй | wallet.frozen_amount-ыг чөлөөлөх (мөнгө wallet-д үлднэ) |
| Хэрэглэгч wallet refund хүсэх | Bonum reverse API дуудна → 1–3 хоног дотор картанд буцна |
| Системийн алдаа | Manual review → admin dashboard-аас approve |

### 9.1 Bonum refund API

```http
POST https://psp.bonum.mn/api/transaction/refund
Content-Type: application/json

{
  "merchantId": "{{BONUM_MERCHANT_ID}}",
  "originalTransactionId": "TXN-...",
  "refundAmount": 10000,
  "reason": "User requested wallet refund"
}
```

### 9.2 Анхаарах зүйлс

- Refund нь **Bonum-ийн merchant balance-д хүрэлцэхүйц мөнгө** байх ёстой
- Merchant settlement schedule (T+1) болон refund volume-г track хийх дашбоард шаардлагатай
- Partial refund дэмждэг эсэхийг Bonum-аас баталгаажуулах
- Refund event-д тусдаа webhook ирэх (`event_type = 'refund'`)

---

## 10. Payment Provider Abstraction

Backend дээр provider-agnostic interface дизайнаар бичих нь чухал.

### 10.1 Interface

```typescript
// src/modules/payments/payment-provider.interface.ts
export interface PaymentProvider {
  name: 'bonum' | 'socialpay';

  createInvoice(params: {
    amount: number;
    orderId: string;
    description: string;
    metadata?: Record<string, unknown>;
  }): Promise<{
    invoiceId: string;
    qrText: string;
    qrImage: string;
    deepLinks?: Record<string, string>;
    expiresAt: Date;
  }>;

  verifyWebhook(payload: unknown, signature: string): boolean;

  getInvoiceStatus(invoiceId: string): Promise<
    'pending' | 'paid' | 'failed' | 'expired'
  >;

  refund(transactionId: string, amount: number): Promise<{
    refundId: string;
    status: 'pending' | 'completed';
  }>;
}
```

### 10.2 Bonum implementation

```typescript
// src/modules/payments/bonum/bonum.provider.ts
@Injectable()
export class BonumProvider implements PaymentProvider {
  readonly name = 'bonum';

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService
  ) {}

  async createInvoice(params) {
    // ...
  }

  verifyWebhook(payload, signature) {
    const expected = createHmac('sha256', this.config.get('BONUM_MERCHANT_KEY'))
      .update(JSON.stringify(payload))
      .digest('hex');
    return timingSafeEqual(expected, signature);
  }

  // ...
}
```

### 10.3 Ач холбогдол

- SocialPay нэмэх, ирээдүйд бусад provider солих хялбар
- Test environment-д mock provider оруулах
- A/B test хийх боломжтой (зарим хэрэглэгчид Bonum, зарим SocialPay)

---

## 11. Edge Cases ба Шийдэл

| Тохиолдол | Шийдэл |
|---|---|
| Хэрэглэгч QR scan-сан ч төлбөр хийгээгүй | Invoice 5 минутын дараа expire, шинэ invoice үүсгэх |
| Webhook ирээгүй (Bonum side timeout) | Cron 5 минут тутамд "pending" invoice status poll |
| Хэрэглэгч төлбөр хийсэн ч app-аас гарсан | WebSocket reconnect-д wallet status дамжуулах + push |
| Wallet хүрэхгүй болсон үед rental эхлэх | Cabinet команд явуулахаас өмнө шалгана, "Wallet ачаалах" UX |
| Refund + Bonum merchant balance хүрэлцэхгүй | Settlement-ээс хойш automatic retry, эсвэл manual transfer |
| Хоёр rental зэрэг эхлүүлэх оролдлого | Redis lock + DB unique constraint |
| Хэрэглэгч cabinet QR scan-сан ч cabinet offline | Backend offline detection-аар алдаа буцаах, frozen_amount тавихгүй |
| Power bank cabinet-д орсон ч rental "active" хэвээр | IoT discrepancy reconciliation cron — slot status vs rental status харьцуулах |
| Бонусын мөнгө (promotion) нэмэх | Wallet-д `bonus_balance` нэмэлт column, charge order: bonus first → balance |

---

## 12. Cron Jobs

| Cron | Давтамж | Үйлдэл |
|---|---|---|
| `pending-invoice-poll` | 5 мин | Bonum-аас "pending" invoice статус татах |
| `expired-invoice-cleanup` | 10 мин | Хугацаа хэтэрсэн invoice-уудыг `expired` болгох |
| `overdue-rental-warning` | 1 цаг | 24+ цаг overdue rental-уудад email/SMS |
| `overdue-rental-charge` | 6 цаг | 72+ цаг overdue rental-аас power bank үнэ хасах |
| `daily-reconciliation` | 1 өдөр | Bonum settlement vs internal ledger тулгалт |
| `webhook-retry` | 1 мин | Failed webhook processing-ийг retry |

---

## 13. Аюулгүй байдал

- **HMAC signature verification** заавал (timing-safe compare)
- **HTTPS only** (callback URL)
- **IP whitelist** Bonum callback IP-уудыг (доументацид заасан)
- **Rate limiting** topup endpoint дээр (DDoS урьдчилан сэргийлэх)
- **PCI scope-аас гадуур** — карт мэдээлэл backend-д хэзээ ч хүргэхгүй (Bonum-н hosted page-р)
- **Audit log** — wallet өөрчлөлт бүр хэн, хэзээ, юуг хийсэн лог
- **Manual refund approval** — admin dashboard-аас approval-аар
- **Anomaly detection** — нэг хэрэглэгч 1 цагт 10+ topup → manual review

---

## 14. Тестлэх зөвлөмж

### 14.1 Unit tests

- Wallet balance тооцоолол (signed amount-ийн нийлбэр === balance)
- HMAC verification
- Rental cost calculation (hour rounding edge cases)

### 14.2 Integration tests

- Bonum mock server-тэй full topup flow
- Webhook idempotency (нэг event-ийг 5 удаа илгээх)
- Concurrent rental start (2 rental зэрэг)

### 14.3 E2E tests

- User signup → wallet topup → rental start → return → email receipt
- Overdue scenario (time travel-аар 72 цаг хойш)
- Refund flow

---

## 15. Хураангуй

1. **Bonum QR pay-д native card hold байхгүй** учраас барьцааг "wallet pre-load" загвараар загварчлана
2. Хэрэглэгч **анх ₮5,000–₮20,000 ачаалж**, дараа нь rental тус бүр wallet-аас хасна
3. **frozen_amount field**-ээр "soft hold" хийнэ, бодит мөнгө хөдлөхгүй
4. **Webhook signature verify + idempotency** заавал хэрэгтэй
5. **PaymentProvider interface**-ээр Bonum-ыг абстракцлаж, SocialPay/бусад provider plug-in хийх боломжтой болгоно
6. **Refund** нь Bonum reverse API-аар 1–3 хоногт банкны карт руу буцаагдана
7. **Concurrency** нь Redis distributed lock + DB transaction + DB-level constraint-аар шийдэгдэнэ
8. **Reconciliation cron** өдөр бүр Bonum settlement-тэй internal ledger-ийг тулгана
