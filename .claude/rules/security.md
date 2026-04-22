---
description: Security rules — secrets, HMAC, RBAC, rate limit, PII
---

# Security

## Pre-commit checklist

- [ ] `.env*` staged-д ороогүй
- [ ] Bonum/DAN/JWT secret hardcode хийгдээгүй
- [ ] Webhook signature timing-safe verify
- [ ] Rate limit: auth + topup endpoint
- [ ] National ID (РД) plaintext хадгалаагүй (hash + salt)
- [ ] Error message сенситив мэдээлэл (internal ID, stack) гаргахгүй

## Secret

```typescript
// ✗ const key = 'abcd...'
// ✓
constructor(config: ConfigService) {
  this.merchantKey = config.getOrThrow('BONUM_MERCHANT_KEY')
}
```

Production: AWS Secrets Manager / Vault / K8s Secrets (External Secrets Operator).

## Bonum Webhook HMAC (timing-safe)

```typescript
import { createHmac, timingSafeEqual } from 'crypto'

function verifyBonumWebhook(rawBody: string, signature: string, secret: string) {
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  if (signature.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}
```

**Чухал**: parsed body биш, **raw body**. NestJS `rawBody: true` middleware заавал.

## DAN OIDC State (CSRF)

```typescript
async initiate(userId: string) {
  const state = randomBytes(32).toString('hex')
  await this.redis.set(`dan:state:${state}`, userId, 'EX', 300)  // 5 мин
  return buildAuthUrl({ state, ... })
}

async callback(code: string, state: string) {
  const userId = await this.redis.getdel(`dan:state:${state}`)
  if (!userId) throw new InvalidStateException()  // CSRF / expired
  // ... token exchange + userinfo
}
```

## National ID (РД)

```typescript
// ✗ nationalId: 'УН12345678'
// ✓
const nationalIdHash = createHash('sha256')
  .update(nationalId + this.config.NATIONAL_ID_HASH_SALT)
  .digest('hex')

await this.prisma.danVerification.create({
  data: {
    userId, nationalIdHash,
    givenName: this.pii.encrypt(claims.given_name),  // AES-256
    familyName: this.pii.encrypt(claims.family_name),
  },
})
```

## Rate Limiting

```typescript
@Throttle({ default: { limit: 10, ttl: 60_000 } }) @Post('otp/request')
@Throttle({ default: { limit: 5, ttl: 60_000 } })  @Post('login')
@Throttle({ default: { limit: 5, ttl: 60_000 } })  @Post('wallet/topup')
@Throttle({ default: { limit: 100, ttl: 60_000 } }) @Get('stations/nearby')
```

## Auth Guard

```typescript
@UseGuards(JwtAuthGuard) @Get('me')
@UseGuards(JwtAuthGuard, TrustTierGuard) @RequireTier(2) @Post('wallet/topup')
@UseGuards(JwtAuthGuard, RolesGuard) @Roles(Role.ADMIN) @Post('refunds/:id/approve')
```

## CORS

```typescript
app.enableCors({
  origin: [MOBILE_APP_SCHEME, ADMIN_DASHBOARD_URL, ...(isDev ? localhost : [])],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
})
```

## Wallet concurrency

Wallet mutation бүгд: `redis.lock('wallet:${userId}')` → `prisma.$transaction` → `SELECT ... FOR UPDATE` → constraint check → update + log. Дэлгэрэнгүй: `rules/payment.md`.

## Audit log (заавал)

- Wallet mutation бүр (type, amount, reference)
- Payment event (Bonum webhook, refund)
- DAN callback (PII redacted)
- Admin action (refund approve, user ban)

## Bcrypt (хэрвээ password нэмбэл)

```typescript
import { hash, compare } from 'bcrypt'
await hash(password, 12)  // SALT_ROUNDS = 12
```

## Аюулгүй байдлын асуудал

1. **ЗОГС** — кодоос гар
2. `security-reviewer` agent ажиллуул
3. CRITICAL засах хүртэл үргэлжлэхгүй
4. Exposed secret → дороо rotate
5. Ижил алдааг бусад файлд хайх

## PCI DSS

- Card data backend-д хэзээ ч ороохгүй (Bonum hosted page)
- Bonum `transactionId` нь PII биш
