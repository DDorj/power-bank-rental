---
description: Testing standards and TDD workflow
paths:
  - "**/*.spec.ts"
  - "test/**"
---

# Testing

## Coverage

- Unit: 80%+ ерөнхий, **90%+** wallet/payment/auth/rental
- Integration: API endpoint бүрт (supertest + testcontainers PostgreSQL/Redis)
- E2E: Signup → topup → rental start → return (Playwright)

## TDD (заавал)

```
1. RED      — test бич, FAIL байх ёстой
2. GREEN    — хамгийн бага код, дамжтал
3. REFACTOR — код цэвэрлэ, test алдагдуулахгүй
```

Шинэ feature/bug fix-д test-first.

## Файлын байршил

```
src/modules/rentals/
├── rentals.service.ts
├── rentals.service.spec.ts          ← Unit (mocked deps)
├── rentals.controller.spec.ts       ← Integration (real DB)
└── rental-state-machine.spec.ts     ← Unit

test/
├── mocks/
│   ├── bonum-server.ts              ← HTTP mock
│   └── cabinet-simulator.ts         ← MQTT mock
├── fixtures/users.ts
└── integration/{rental-flow,bonum-webhook}.e2e-spec.ts
```

## Unit жишээ (Wallet)

```typescript
describe('WalletService.freezeForRental', () => {
  it('available_balance < amount → InsufficientBalanceException', async () => {
    repository.findByUserId.mockResolvedValue({ balance: 2000, frozen_amount: 0 })

    await expect(service.freezeForRental('u1', 'r1', 3000))
      .rejects.toThrow(InsufficientBalanceException)
    expect(repository.applyTransaction).not.toHaveBeenCalled()
  })

  it('амжилттай → frozen_amount нэмэгдэж лог хийгдэнэ', async () => {
    repository.findByUserId.mockResolvedValue({ id: 'w1', balance: 10000, frozen_amount: 0 })

    await service.freezeForRental('u1', 'r1', 3000)

    expect(repository.applyTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'freeze', amount: -3000, referenceId: 'r1' })
    )
  })
})
```

## Integration жишээ (Bonum webhook)

```typescript
describe('POST /payments/bonum/callback', () => {
  it('valid signature + pending invoice → wallet credited', async () => {
    await prisma.bonumInvoice.create({ data: { ..., status: 'pending' } })
    const signature = createHmac('sha256', KEY).update(JSON.stringify(payload)).digest('hex')

    const res = await request(app).post('/payments/bonum/callback')
      .set('X-Signature', signature).send(payload)

    expect(res.status).toBe(200)
    const wallet = await prisma.wallet.findUnique({ where: { userId } })
    expect(wallet.balance).toBe(10000)
  })

  it('duplicate transactionId → alreadyProcessed: true', async () => { /* ... */ })
  it('invalid signature → 401', async () => { /* ... */ })
})
```

## E2E жишээ (Playwright)

```typescript
test('signup → topup → rental → return', async ({ page }) => {
  // 1. Phone OTP signup
  // 2. Topup 10K + mockBonumPayment(...) → balance = ₮10,000
  // 3. simulateCabinetScan(cabinetId, slotId) → rental active
  // 4. simulateCabinetReturn(cabinetId, serial) → complete
})
```

## Хориотой

- `// @ts-ignore` тестэд
- Тестийг засах (implementation засна; тест буруу бол л тестийг засна)
- `setTimeout`/`sleep` (fake timers ашигла)
- DB mock-той integration test (real DB заавал — testcontainers)
- Тестүүд хооронд shared state (`afterEach` cleanup)

## Critical Path Scenarios

`rental-flow-tester` agent ашиглана:

**Rental start:** happy / insufficient wallet / cabinet offline / slot occupied / ACK timeout / 2 concurrent
**Rental return:** on-time / different cabinet / serial mismatch / overdue race
**Bonum webhook:** valid PAID / invalid HMAC / duplicate / unknown order / 5 parallel
**DAN:** valid → tier 2 / state mismatch / duplicate national_id_hash / expired session

## Coverage script

```json
"test:cov:critical": "jest --coverage src/modules/{wallet,payments,auth,rentals}"
```

CI: critical module coverage **< 90% бол fail**.
