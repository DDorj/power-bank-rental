# Project Initialization Workflow

> Power Bank Rental backend project-ийг тэг-аас эхлүүлэх алхам бүрийн жагсаалт.
> Алхам бүр **бие даан коммит хийх боломжтой** жижиг хэмжээтэй.

---

## Phase 0 — Prerequisites (1 өдөр)

- [ ] Node.js 20 LTS суулгасан эсэхийг шалгах
- [ ] Docker Desktop ажилладаг эсэхийг шалгах
- [ ] PostgreSQL 16 client (psql) суулгах
- [ ] `nest`, `prisma` CLI глобал бус, харин `npx`-ээр ашиглах
- [ ] Github repo үүсгэх — `power-bank-rental-backend`
- [ ] Branch protection: `main`, `develop` — required reviews + status checks
- [ ] Issue tracker (Github Projects) бүтэц: Backlog → In Progress → Review → Done
- [ ] CI/CD provider сонгох (Github Actions зөвлөж байна)

---

## Phase 1 — Skeleton (2 өдөр)

### Алхам 1.1 — NestJS scaffold
```bash
npx @nestjs/cli new power-bank-rental-backend --package-manager npm
cd power-bank-rental-backend
git init && git add . && git commit -m "chore: initial NestJS scaffold"
```

### Алхам 1.2 — Prisma + PostgreSQL
```bash
npm install prisma @prisma/client
npx prisma init
# DATABASE_URL=postgresql://... .env-д
```

### Алхам 1.3 — Docker Compose (dev)
```yaml
# docker-compose.yml
services:
  postgres:
    image: postgis/postgis:16-3.4
    ports: ["5432:5432"]
    environment:
      POSTGRES_USER: pbr
      POSTGRES_PASSWORD: pbr_dev
      POSTGRES_DB: pbr
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
  emqx:
    image: emqx/emqx:5
    ports: ["1883:1883", "8083:8083", "18083:18083"]
```

### Алхам 1.4 — TS strict + linting
- `tsconfig.json`: `strict: true`, `noUncheckedIndexedAccess: true`
- ESLint + Prettier + lint-staged + husky pre-commit
- `npm run typecheck` script нэмэх

### Алхам 1.5 — Health endpoint
- `GET /health` — DB + Redis + MQTT broker ping
- Smoke test: `curl localhost:3000/health` → 200

**Commit checkpoint:** `feat: project skeleton with health endpoint`

---

## Phase 2 — Core Domain Models (2 өдөр)

### Алхам 2.1 — Prisma schema (Phase 1)
```
User, AuthIdentity, DanVerification, Wallet, WalletTransaction
Station, PowerBank, Rental, RentalEvent
BonumInvoice, BonumWebhookEvent
Partner, Venue
AuditLog
```

### Алхам 2.2 — DB constraints
- `wallets.balance >= 0`
- `wallets.frozen_amount <= balance`
- `UNIQUE active_rental_per_user WHERE status = 'active'`
- `UNIQUE bonum_webhook_events.transaction_id`

### Алхам 2.3 — Initial migration
```bash
npx prisma migrate dev --name init
```

**Commit checkpoint:** `feat: initial Prisma schema with constraints`

---

## Phase 3 — Auth Module (3 өдөр)

### Алхам 3.1 — Phone OTP
- SMS gateway integration (Mobicom/Unitel)
- `POST /auth/otp/request`, `POST /auth/otp/verify`
- Rate limit 10/hr per phone
- Test: invalid OTP, expired OTP, replay

### Алхам 3.2 — JWT + refresh
- `JwtStrategy` + `JwtAuthGuard`
- Refresh token Redis-д, rotate-тэй
- `@Public()` decorator public endpoint-уудад

### Алхам 3.3 — Google OAuth
- `passport-google-oauth20`
- `GET /auth/google`, `GET /auth/google/callback`
- Account linking логик

### Алхам 3.4 — DAN OIDC
- `dan.strategy.ts` (passport-oauth2 base-аар custom)
- State parameter Redis 5-мин TTL
- РД hash + PII encryption
- `dan_verifications` insert + tier upgrade
- Audit log

### Алхам 3.5 — Trust tier system
- `@RequireTier(n)` decorator
- `TrustTierGuard`
- Tier limits enum

**Commit checkpoint per sub-step.** Use `dan-auth-expert` agent for review.

---

## Phase 4 — Wallet Module (2 өдөр)

### Алхам 4.1 — Wallet service core
- `WalletService.applyTransaction()` — заавал `wallet_transactions` лог + DB transaction
- `freezeAmount()`, `unfreezeAmount()`, `chargeFromFrozen()`
- Redis lock `wallet:${userId}` бүх mutation-д

### Алхам 4.2 — Wallet REST endpoints
- `GET /wallet` — balance + frozen + available
- `POST /wallet/topup` — Bonum invoice үүсгэнэ
- `GET /wallet/transactions` — paginated history

### Алхам 4.3 — Wallet tests
- Unit: balance arithmetic, transaction log invariants
- Integration: concurrent topup + freeze (10 parallel)
- Edge: insufficient balance, lock timeout

**Commit checkpoint:** `feat: wallet module with concurrency-safe transactions`. Use `bonum-payment-expert` agent.

---

## Phase 5 — Bonum Payment Integration (3 өдөр)

### Алхам 5.1 — PaymentProvider interface
- `src/modules/payments/payment-provider.interface.ts`
- Mock provider for tests

### Алхам 5.2 — BonumProvider implementation
- `createInvoice`, `verifyWebhook`, `getInvoiceStatus`, `refund`
- HMAC-SHA256 signature
- Retry logic (3× exponential backoff)

### Алхам 5.3 — Webhook handler
- `POST /payments/bonum/callback`
- Signature verify (timing-safe)
- Idempotency via `bonum_webhook_events` unique constraint
- Wallet credit DB transaction-д

### Алхам 5.4 — Cron jobs
- `pending-invoice-poll` (5 мин)
- `expired-invoice-cleanup` (10 мин)
- `daily-reconciliation` (1 өдөр)

### Алхам 5.5 — Bonum mock server
- `test/mocks/bonum-server.ts`
- Integration test: full topup flow + webhook idempotency (5×)

**Commit checkpoint per sub-step.** Use `bonum-payment-expert` agent for review before merge.

---

## Phase 6 — Station + PowerBank + IoT (3 өдөр)

### Алхам 6.1 — Station/PowerBank CRUD
- Admin-only endpoints
- PostGIS query: nearest stations within radius

### Алхам 6.2 — MQTT gateway
- EMQX connection, TLS + per-cabinet client cert
- Topic subscriptions: `cabinets/+/status`, `cabinets/+/slot/+`, `cabinets/+/heartbeat`, `cabinets/+/ack/+`
- Heartbeat tracker (90s timeout → offline)

### Алхам 6.3 — Cabinet command service
- `releaseSlot(cabinetId, slotId)` — командаар + ACK хүлээх (60s timeout)
- `lockSlot(cabinetId, slotId)`
- Command ID лог + audit

### Алхам 6.4 — Cabinet simulator
- `test/mocks/cabinet-simulator.ts`
- Local dev үед docker-аар ажиллах
- Configurable behavior (random ACK delay, drop messages)

**Commit checkpoint:** `feat: IoT cabinet integration with mock simulator`. Use `iot-cabinet-expert` agent.

---

## Phase 7 — Rental Flow (3 өдөр)

### Алхам 7.1 — Rental state machine
- States: `pending → active → completed | failed | overdue`
- `RentalStateMachine.transition()` — атомар DB update + event emit
- `UPDATE rentals.status` шууд хориглох (CI lint rule)

### Алхам 7.2 — Rental start endpoint
- `POST /rentals/start` body: `{ cabinetId, slotId }`
- Trust tier check
- Wallet freeze → IoT command → ACK хүлээх → state transition
- Failure rollback (frozen release)

### Алхам 7.3 — Rental return endpoint
- `POST /rentals/return` body: `{ cabinetId, slotId, powerBankSerial }`
- Cost calculation (`ceil(duration/hour) × hourly_rate`)
- Wallet charge + frozen release
- Email receipt event

### Алхам 7.4 — Overdue cron
- `overdue-rental-warning` (1 цаг)
- `overdue-rental-charge` (6 цаг)

### Алхам 7.5 — End-to-end test
- Full flow: signup → topup → start → return
- Concurrent rental start (DB unique constraint test)

**Commit checkpoint per sub-step.** Use `rental-flow-tester` agent for test coverage.

---

## Phase 8 — Notifications (2 өдөр)

### Алхам 8.1 — Email service abstraction
- `EmailService` + `ResendProvider`
- Template registry (MJML/React Email)

### Алхам 8.2 — Email templates
- Email verification, welcome, identity verified
- Rental receipt, deposit hold/release, overdue warning
- Monthly usage report, partner monthly revenue

### Алхам 8.3 — SMS service
- Mobicom/Unitel adapter
- Templates: OTP, overdue warning

### Алхам 8.4 — Push notifications
- FCM integration
- Token registration endpoint
- Topic-based broadcasts

### Алхам 8.5 — Event-driven hookup
- BullMQ queue: `email`, `sms`, `push`
- Domain events emit → queue producer → worker

**Commit checkpoint:** `feat: notification system with email/sms/push`

---

## Phase 9 — Admin Dashboard (3 өдөр)

### Алхам 9.1 — Admin API
- Station/PowerBank/User CRUD
- Manual refund approval workflow
- Audit log search

### Алхам 9.2 — Frontend (Next.js + Refine)
- Auth via existing JWT
- Tables: Users, Stations, Rentals, Refunds, Audit
- KPI dashboard

### Алхам 9.3 — Reconciliation UI
- Daily settlement vs internal ledger compare
- Manual override approval

**Commit checkpoint:** `feat: admin dashboard MVP`

---

## Phase 10 — Production Readiness (3 өдөр)

### Алхам 10.1 — Observability
- OpenTelemetry SDK
- Pino logger → Loki
- Prometheus metrics

### Алхам 10.2 — Security audit
- `npm audit` clean
- Snyk / Dependabot
- Secret scan
- HTTPS only, HSTS

### Алхам 10.3 — Load test
- k6 script: 1000 RPS health, 100 RPS rental start
- Bottleneck identification

### Алхам 10.4 — Docs
- API docs (Swagger / Redoc)
- Runbook (oncall response)
- Database backup procedure

### Алхам 10.5 — Deploy
- Kubernetes manifests
- Secrets via External Secrets Operator
- Blue/green deployment

**Final commit:** `chore: production-ready release v0.1.0`

---

## Хугацааны нийт тооцоо

| Phase | Хугацаа | Шинж |
|---|---|---|
| 0. Prerequisites | 1 өдөр | Setup |
| 1. Skeleton | 2 өдөр | Foundation |
| 2. Domain models | 2 өдөр | Schema |
| 3. Auth | 3 өдөр | Critical |
| 4. Wallet | 2 өдөр | Critical |
| 5. Bonum payment | 3 өдөр | Critical |
| 6. IoT cabinet | 3 өдөр | Hardware-dep |
| 7. Rental flow | 3 өдөр | Core feature |
| 8. Notifications | 2 өдөр | UX |
| 9. Admin dashboard | 3 өдөр | Ops |
| 10. Production ready | 3 өдөр | Polish |
| **Нийт** | **27 өдөр** | ~5–6 ажлын долоо хоног |

> 1 backend хөгжүүлэгчээр. 2 хүн зэрэг ажиллавал ~3 долоо хоног.

---

## Branch & PR Workflow

```
main (protected)
  └── develop
       ├── feat/auth-phone-otp
       ├── feat/auth-dan-oidc
       ├── feat/wallet-core
       ├── feat/payments-bonum
       ├── feat/iot-mqtt
       ├── feat/rental-state-machine
       └── ...
```

- PR-ыг feature branch → `develop` рүү
- `develop` → `main` нь release-ийн үед
- PR title: `feat(scope): description` (conventional commits)
- PR body: что/яагаад/test plan checklist
- Review хийгдээгүй PR merge хийгдэхгүй (branch protection)

---

## Дараах ашиглах Claude tooling

| Хэрэгсэл | Хэзээ |
|---|---|
| `bonum-payment-expert` agent | Wallet/payment код бичих + review |
| `dan-auth-expert` agent | Auth/KYC код бичих + review |
| `iot-cabinet-expert` agent | MQTT/IoT код бичих + review |
| `nestjs-module-generator` agent | Шинэ module scaffold |
| `rental-flow-tester` agent | Rental flow тест бичих |
| `format-on-edit.sh` hook | Автомат Prettier |
| `block-no-verify.sh` hook | Аюултай git command хаах |
| `typecheck-on-stop.sh` hook | Session төгсөхөөс өмнө tsc шалгалт |
