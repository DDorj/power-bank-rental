---
description: TypeScript/NestJS coding style for Power Bank Rental
paths:
  - "src/**/*.ts"
---

# Coding Style

## TypeScript

- `strict: true`, `any` хориотой (→ `unknown` + narrow)
- Enum-ийн оронд `as const` object:

```typescript
const RENTAL_STATUS = {
  PENDING: 'pending', ACTIVE: 'active', COMPLETED: 'completed',
  OVERDUE: 'overdue', FAILED: 'failed',
} as const
type RentalStatus = typeof RENTAL_STATUS[keyof typeof RENTAL_STATUS]
```

## Immutability

Mutation хориотой — spread copy:

```typescript
// ✗ rental.status = 'active'
// ✓ const updated = { ...rental, status: 'active' as const }
```

`wallet.balance` / `frozen_amount`-ийг JS side-аас хэзээ ч "өөрчлөхгүй" — DB transaction + `wallet_transactions` лог-оор л (rules/payment.md).

## Function/File хэмжээ

- Function: max 50 мөр, nesting max 4 (early return ашиглах)
- File: ердийн 200–400, max 800. Том бол feature-ээр салгах (`wallet-freeze.service.ts` гэх мэт)

## Error Handling

- Чимээгүй залгилт хориотой (`catch {}`)
- Generic `Error` хориотой — domain exception (`InsufficientBalanceException`, `CabinetOfflineException`, `PaymentProviderException` гэх мэт)
- Error log нь structured: `this.logger.error('msg', { context, error: error.message })`

## NestJS

- Service дотор Prisma шууд биш — **Repository** layer
- DTO дээр `class-validator` decorator заавал
- `@CurrentUser()`, `@RequireTier(n)`, `@Roles(Role.ADMIN)` decorator
- Cross-module — зөвхөн service layer

## Logger (Pino)

- `console.log` хориотой
- PII (phone, email, national_id) plaintext лог-д хориотой — hash хийнэ
- Structured JSON, string concat биш

## Naming

| Зүйл | Convention |
|---|---|
| Class / Exception | `PascalCase` / `...Exception` |
| Variable / function | `camelCase` |
| Constant | `SCREAMING_SNAKE` |
| File | `kebab-case.ts` |
| DB table/column | `snake_case` |
