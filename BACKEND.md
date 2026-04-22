# Power Bank Rental — Backend Requirements

> **Огноо:** 2026-04-21
> **Зорилго:** Power bank түрээсийн үйлчилгээний backend project эхлүүлэхэд шаардлагатай үндсэн бүрэлдэхүүн, технологи, интеграцуудыг тодорхойлох.

---

## 1. Үндсэн домэйнүүд (Modules)

| Модуль | Функционал |
|---|---|
| **Auth/User** | Утасны OTP + **Google OAuth 2.0 (OIDC)** + Email/password + **DAN баталгаажуулалт (KYC)**, account linking, JWT, tiered trust |
| **Station/Cabinet** | Станцын метадата, слотын төлөв, газарзүйн координат (PostGIS) |
| **Power Bank** | Серийн дугаар, цэнэгийн төвшин, төлөв (rented / charging / idle / faulty) |
| **Rental** | Идэвхтэй түрээс, төлбөр тооцоо, буцаалт, хугацаа хэтрэлт, refund |
| **Pricing** | Цаг тутмын тариф, өдрийн дээд хязгаар, барьцаа, динамик үнэ |
| **Payment** | Bonum QR pay / SocialPay интеграц, барьцаа hold/release, refund |
| **IoT Gateway** | Cabinet ↔ backend MQTT/WebSocket холбоо, command dispatch |
| **Partner/Venue** | Кафе-ресторан партнер, орлого хуваах тооцоо |
| **Notification** | SMS, push, **Email (transactional + marketing)** |
| **Admin/Analytics** | Үйл ажиллагааны хяналт, тайлан, KPI |

---

## 2. Технологийн стек

### Сонголт A: TypeScript + NestJS (зөвлөмж)

- **Framework:** NestJS (DI, modular, танай xac-backend / trans-bank-тэй ойр)
- **ORM:** Prisma эсвэл TypeORM
- **Auth:** `@nestjs/passport` + `passport-google-oauth20` + `passport-jwt` + DAN OAuth/OIDC client
- **Email:** `@nestjs-modules/mailer` + Handlebars/MJML, эсвэл `resend` SDK
- **Validation:** `class-validator` + DTO

### Сонголт B: Go + Gin/Fiber

- IoT MQTT-ийн өндөр throughput (10K+ cabinet) шаардлагатай үед
- **Auth:** `golang.org/x/oauth2/google`
- **Email:** `gomail` эсвэл provider SDK

### Дундын дэд бүтэц

| Зориулалт | Технологи |
|---|---|
| Реляцийн DB | **PostgreSQL** + **PostGIS** (ойр станц хайх) |
| Cache / lock | **Redis** (session, rental lock, rate limit) |
| Message broker | **RabbitMQ** эсвэл BullMQ (overdue билл, retry, async job) |
| IoT broker | **EMQX** эсвэл Mosquitto (MQTT 5) |
| API | REST + **WebSocket** (mobile app real-time) |
| Container | Docker + Compose (dev), **Kubernetes** (prod) |
| Observability | OpenTelemetry, Grafana, Loki, Prometheus |
| CI/CD | GitHub Actions / GitLab CI |

---

## 3. Гадаад интеграцууд

### 3.1 Төлбөр

- **Bonum Gateway (QR pay only)** — QR-based invoice, callback webhook, барьцаа нь invoice + reverse loop хэлбэрээр
- **SocialPay** SDK
- (Сонголтоор) **Stripe** — international card

### 3.2 Auth

- **Google OAuth 2.0 / OIDC**
  - Google Cloud Console дээр OAuth 2.0 Client ID үүсгэх
  - Authorized redirect URIs: `https://api.example.mn/auth/google/callback`
  - Scopes: `openid`, `email`, `profile`

- **DAN (Дижитал Аюулгүй Нэвтрэлт) — иргэний баталгаажуулалт / KYC**
  - Үндэсний дата төв (datacenter.gov.mn)-аас merchant integration зөвшөөрөл авах
  - OAuth 2.0 / OIDC үндсэнтэй federated identity provider
  - Зориулалт: Иргэний регистр баталгаажуулах, нас (18+) шалгах, fraud prevention, өндөр trust tier нээх
  - Эх сурвалж: дижитал гарын үсэг, банкны нэвтрэлт, OTP, MFA дэмждэг
  - Authorized redirect URI: `https://api.example.mn/auth/dan/callback`
  - Авах claims: `national_id` (РД), `given_name`, `family_name`, `birthdate`, `gender`

### 3.3 Notification

- **SMS gateway** (Mobicom / Unitel API) — OTP, мэдэгдэл
- **Firebase Cloud Messaging (FCM)** — mobile push
- **Email gateway** — сонголтууд:

  | Provider | Давуу тал | Сул тал |
  |---|---|---|
  | **Resend** | Орчин үеийн API, React Email template, хялбар integration | Шинэ provider, Mongolia-д харьцангуй танил бус |
  | **SendGrid** | Найдвартай, түгээмэл, өргөн feature | Pricing өндөр |
  | **AWS SES** | Хамгийн хямд (өндөр volume), AWS-тэй нэг ecosystem | DKIM/SPF өөрсдөө тохируулах, deliverability-д ажиллах хэрэгтэй |
  | **Postmark** | Transactional-д хамгийн өндөр deliverability | Marketing email-д тохиромжгүй |

  **Зөвлөмж:** Эхэлж **Resend**, scale болсны дараа **AWS SES**-руу шилжих.

### 3.4 Бусад

- **Map provider** — Google Maps эсвэл Mapbox (станц discovery)
- **Object storage** — S3 / Cloudflare R2 (KYC баримт, profile зураг)

---

## 4. Auth flow дизайн

### 4.1 DB schema (төсөөлсөн)

```sql
users
  ├── id (uuid, pk)
  ├── email (nullable, unique)
  ├── phone (nullable, unique)
  ├── name
  ├── primary_auth_method  (google | phone_otp | email_password | dan)
  ├── trust_tier           -- 1: phone only, 2: + DAN verified, 3: + corporate KYC
  ├── kyc_status           -- none | pending | verified | rejected
  ├── kyc_verified_at      -- nullable, DAN-аар баталгаажсан огноо
  ├── created_at
  └── updated_at

auth_identities  (users 1:N)
  ├── id
  ├── user_id (fk → users)
  ├── provider  (google | phone_otp | email_password | dan)
  ├── provider_user_id  (Google sub | phone | email | DAN РД hash)
  ├── verified_at
  └── metadata (jsonb)

  UNIQUE (provider, provider_user_id)

dan_verifications  (users 1:1)
  ├── id
  ├── user_id (fk → users, unique)
  ├── national_id_hash      -- SHA-256(РД + salt), original-ийг хадгалахгүй
  ├── given_name
  ├── family_name
  ├── birthdate
  ├── gender
  ├── verified_at
  ├── dan_session_id        -- DAN side reference (audit)
  └── expires_at            -- баталгаажуулалт сэргээх хугацаа (1 жил гэх мэт)
```

> **Аюулгүй байдлын анхааруулга:** Регистрийн дугаарыг **plaintext** хэлбэрээр хадгалахгүй. Хайлтад зориулсан hash + бусад харуулах талбарыг шифрлэн (column-level encryption) хадгална.

### 4.2 Account linking логик

- Хэрэглэгч Google-аар нэвтрэхэд тухайн email-тэй user байгаа эсэхийг шалгана
  - **Байхгүй:** шинэ user + auth_identity үүсгэнэ
  - **Байгаа (verified):** auth_identity-г одоогийн user-т холбож, нэвтрүүлнэ
  - **Байгаа (unverified):** OTP/email verification хийж linking зөвшөөрөл авна
- Phone OTP-аар нэвтэрсэн хэрэглэгч дараа нь Google-ээ "Connect" хийх боломжтой (settings)
- DAN баталгаажуулалт нь нэвтрэлт **биш**, харин **identity verification** алхам — аль хэдийн нэвтэрсэн хэрэглэгч "Verify identity" товч дарж DAN flow-руу redirect хийнэ

### 4.3 Token strategy

- **Access JWT:** богино хугацаатай (15 мин)
- **Refresh token:** Redis-д хадгалагдсан, ротацлагддаг (30 хоног)
- **Device tracking:** олон төхөөрөмжөөс нэвтрэх боломжтой, "log out other devices"

### 4.4 DAN баталгаажуулалт flow

```
[Mobile app]
  └→ Settings → "Иргэний баталгаажуулалт хийх" товч дарна

[Backend] → GET /auth/dan/authorize
  - state = random(32) хадгална Redis-д (5 мин TTL)
  - return: DAN authorization URL (redirect)

[Mobile app]
  └→ DAN OAuth flow (DAN апп эсвэл вэб дээр):
     - Иргэний дижитал гарын үсэг
     - Эсвэл DAN апп OTP
     - Эсвэл MFA

[DAN] → redirect → /auth/dan/callback?code=...&state=...

[Backend]
  1. state-ийг Redis-аас шалгах (CSRF хамгаалалт)
  2. code-ыг access_token-руу солих
  3. /userinfo endpoint-ээс claims татах
  4. national_id-ийг hash хийж duplicate шалгах
     ├── duplicate (өөр user-т холбогдсон) → reject + flag for review
     └── unique → continue
  5. dan_verifications table-д insert
  6. user.kyc_status = 'verified', trust_tier = 2
  7. Audit log
  8. Хэрэглэгчид email мэдэгдэл + wallet limit өсгөв гэдгийг харуулах

[Mobile app]
  └→ "Баталгаажлаа ✓" + шинэ боломжуудыг харуулна
```

### 4.5 Trust tier-ийн нөлөө

| Tier | Шаардлага | Wallet хязгаар | Боломж |
|---|---|---|---|
| **1 (Basic)** | Phone OTP ганцхан | ₮20,000 | Энгийн rental, нэг үед 1 power bank |
| **2 (Verified)** | + DAN verified | ₮100,000 | Илүү барьцаа хязгаар, 2 power bank зэрэг |
| **3 (Corporate)** | + Гэрээ + DAN | ₮1,000,000 | Багц төлбөр, business invoice, олон хэрэглэгч |

### 4.6 KYC дахин баталгаажуулалт

- DAN verification 1 жилийн хугацаатай (`expires_at`)
- Хугацаа дуусахаас 30 хоногийн өмнө email/push мэдэгдэл
- Шинэчлэхгүй бол `trust_tier` 1-руу буцаана

---

## 5. Email use case-ууд

| Email | Trigger | Template type |
|---|---|---|
| Email verification | Signup with email | Transactional |
| Welcome | First login | Transactional |
| **Identity verified (DAN)** | KYC баталгаажсан үед | Transactional |
| **KYC expiring soon** | DAN expires_at - 30 өдөр | Transactional |
| Rental receipt | Rental return | Transactional |
| Deposit hold | Rental start | Transactional |
| Deposit release | Rental complete | Transactional |
| Overdue warning | 24+ hour overdue | Transactional |
| Monthly usage report | Cron job (1-r өдөр) | Transactional |
| Partner monthly revenue | Cron job | Transactional |
| Promotion / news | Manual | Marketing |

**Template engine:** **MJML** (responsive HTML email-д хамгийн сайн), эсвэл **React Email** (Resend-тэй сайн ажилладаг).

---

## 6. IoT communication дизайн

### 6.1 MQTT topic structure

```
cabinets/{cabinetId}/status         (cabinet → backend, retain)
cabinets/{cabinetId}/slot/{slotId}  (cabinet → backend, slot status)
cabinets/{cabinetId}/cmd/release    (backend → cabinet, slot release)
cabinets/{cabinetId}/cmd/lock       (backend → cabinet)
cabinets/{cabinetId}/heartbeat      (cabinet → backend, 30s interval)
```

### 6.2 Rental release flow

1. App: rental start запрос
2. Backend: payment hold (Bonum QR invoice) → success
3. Backend: Redis-д rental lock тавих (cabinet+slot)
4. Backend: MQTT-ээр `cmd/release` команд илгээнэ
5. Cabinet: ACK буцаана + slot нээгдсэнийг баталгаажуулна
6. Backend: rental төлвийг "active" болгоно
7. Backend: WebSocket-ээр client-руу real-time update

### 6.3 Failover

- Cabinet 60 секундын дотор ACK буцаахгүй → payment release + хэрэглэгчид retry мэдэгдэх
- Heartbeat-гүй cabinet-ийг "offline" төлөвт оруулах, app-д харуулахгүй

---

## 7. MVP build дараалал

1. **Skeleton + DB schema** (User, AuthIdentity, Station, PowerBank, Rental)
2. **Auth module:**
   - Phone OTP
   - **Google OAuth (account linking-тэй)**
   - Email/password (verification-тэй)
   - JWT + refresh
   - **DAN OIDC баталгаажуулалт + trust tier system**
3. **Cabinet IoT simulator** (бодит hardware гарахаас өмнө mock cabinet)
4. **Rental flow** (start/return) + Redis lock + state machine
5. **Bonum QR pay интеграц** (барьцаа hold/release loop)
6. **Email service abstraction** (provider-agnostic, эхлээд Resend)
7. **Email templates** (verification, rental receipt, deposit notifications)
8. **Mobile app REST/WebSocket эндпойнтууд**
9. **Admin dashboard** (Next.js эсвэл Refine)
10. **Partner revenue tooling** (тайлан + CSV export)

---

## 8. Аюулгүй байдал ба compliance

- **PCI DSS:** төлбөрийн картын мэдээлэл backend-д хадгалахгүй (token only)
- **KYC:** үндэсний регистрийн дугаар + утасны баталгаажуулалт **(DAN-ээр баталгаажсан)**
- **Хувийн мэдээллийн хууль:** РД-ийг hash + бусад PII-ийг column-level encryption (AES-256)
- **DAN audit:** DAN verification бүр-ийн callback, claims, шийдвэрийг audit log-д бичих
- **Rate limiting:** auth endpoint-уудад (10 OTP/цаг, 5 login fail → block)
- **Secrets:** AWS Secrets Manager эсвэл Vault, `.env`-д хэзээ ч хадгалахгүй
- **Audit log:** payment, refund, admin action бүгдийг лог
- **GDPR-style:** хэрэглэгчийн өгөгдөл устгах right
- **CSRF, XSS, SQL injection** хамгаалалт (NestJS guards, parameterized queries)

---

## 9. Project бүтцийн санал (NestJS)

```
power-bank-rental-backend/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── strategies/
│   │   │   │   ├── google.strategy.ts
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   ├── otp.strategy.ts
│   │   │   │   └── dan.strategy.ts
│   │   │   ├── dan/
│   │   │   │   ├── dan.controller.ts
│   │   │   │   ├── dan.service.ts
│   │   │   │   └── dan-claims.dto.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── trust-tier.service.ts
│   │   │   └── account-linking.service.ts
│   │   ├── users/
│   │   ├── stations/
│   │   ├── power-banks/
│   │   ├── rentals/
│   │   ├── pricing/
│   │   ├── payments/
│   │   │   ├── bonum/
│   │   │   └── socialpay/
│   │   ├── iot/
│   │   │   ├── mqtt.gateway.ts
│   │   │   └── cabinet.service.ts
│   │   ├── partners/
│   │   ├── notifications/
│   │   │   ├── email/
│   │   │   │   ├── providers/  (resend, ses)
│   │   │   │   └── templates/   (mjml)
│   │   │   ├── sms/
│   │   │   └── push/
│   │   └── admin/
│   ├── common/  (guards, decorators, filters)
│   ├── config/
│   └── main.ts
├── prisma/
│   └── schema.prisma
├── test/
└── docker-compose.yml
```

---

## 10. Хэрэгтэй ENV хувьсагчид

```bash
# Database
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Auth
JWT_SECRET=...
JWT_REFRESH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://api.example.mn/auth/google/callback

# DAN (Дижитал Аюулгүй Нэвтрэлт)
DAN_CLIENT_ID=...
DAN_CLIENT_SECRET=...
DAN_AUTHORIZATION_URL=https://dan.gov.mn/oauth/authorize
DAN_TOKEN_URL=https://dan.gov.mn/oauth/token
DAN_USERINFO_URL=https://dan.gov.mn/oauth/userinfo
DAN_CALLBACK_URL=https://api.example.mn/auth/dan/callback
DAN_SCOPES=openid profile national_id birthdate
NATIONAL_ID_HASH_SALT=...
PII_ENCRYPTION_KEY=...   # AES-256 key (KMS-аас татна)

# Email
RESEND_API_KEY=...
EMAIL_FROM=noreply@example.mn
EMAIL_FROM_NAME="Power Bank Rental"

# SMS
SMS_GATEWAY_URL=...
SMS_GATEWAY_TOKEN=...

# Payment
BONUM_MERCHANT_ID=...
BONUM_MERCHANT_KEY=...
BONUM_API_URL=https://psp.bonum.mn/...
BONUM_CALLBACK_URL=https://api.example.mn/payments/bonum/callback
SOCIALPAY_MERCHANT_ID=...

# IoT
MQTT_BROKER_URL=mqtt://...
MQTT_USERNAME=...
MQTT_PASSWORD=...

# Push
FCM_SERVER_KEY=...

# Storage
S3_BUCKET=...
S3_REGION=...
```

---

## 11. Дараагийн алхам

1. NestJS skeleton үүсгэх (`nest new`)
2. PostgreSQL + Redis-ийн `docker-compose.yml`
3. Prisma schema (User + AuthIdentity + DanVerification-аас эхлэн)
4. Google OAuth strategy + account linking
5. Email service (Resend)
6. Phone OTP flow
7. **DAN OIDC strategy + trust tier service**
8. Station + PowerBank CRUD
9. Mock IoT cabinet simulator
10. Rental state machine
11. Bonum QR pay integration
