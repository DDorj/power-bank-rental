# Power Bank Rental — Project Instructions

Power bank түрээсийн backend (NestJS, IoT-cabinet суурьтай). Зорилт зах: Монгол.

## Tech Stack

TypeScript + NestJS · Prisma · PostgreSQL 16 + PostGIS · Redis 7 · BullMQ · EMQX (MQTT 5) · Resend (email) · Bonum QR pay · DAN OIDC · Jest + Playwright

Шинэ dependency нэмэхээс өмнө `BACKEND.md`-аас баталгаажуулна.

## Хатуу зарчим

- **UI/email/SMS**: Mongolian. **Код/comment/commit/test**: English.
- **Currency**: MNT integer (decimal БУС, `1500` ✓ `1500.00` ✗)
- **Conventional commits**: `feat(wallet):`, `fix(auth):`, schema migration орвол title-д `[migration]`
- **Cross-module**: зөвхөн service layer (controller → controller хориотой)

## Folder

```
src/modules/{module}/
  {module}.{module,controller,service,repository}.ts
  dto/  events/  __tests__/
src/common/  (guards, decorators, filters, interceptors)
```

## Rules (path-scoped, автомат ачаалдаг)

| Файл | Хамрах | Үндсэн |
|---|---|---|
| `rules/coding-style.md` | `src/**/*.ts` | TS strict, immutability, NestJS pattern |
| `rules/api-design.md` | `*.controller.ts`, `dto/**` | Response envelope, DTO, error code |
| `rules/security.md` | бүх код | Secret, HMAC, RBAC, rate limit |
| `rules/testing.md` | `*.spec.ts`, `test/**` | TDD, coverage 90% (wallet/payment/auth/rental) |
| `rules/payment.md` | `modules/payments/**`, `modules/wallet/**` | Wallet transaction, Bonum, refund |
| `rules/iot.md` | `modules/iot/**`, `modules/rentals/**` | MQTT, command+ACK, state machine |

## Хориотой

- `git push --force` main/develop
- `git commit --no-verify`
- `prisma migrate reset` production
- `console.log` (`Logger` ашиглана)
- Hardcoded secret
- `UPDATE wallets SET balance = ...` шууд (rules/payment.md үзнэ)

## Reference

`RESEARCH.md` · `BACKEND.md` · `PAYMENT.md` · `INIT.md` (project root)
