---
description: API design standards (response envelope, DTO, status code)
paths:
  - "src/modules/**/*.controller.ts"
  - "src/modules/**/dto/**"
---

# API Design

## Response Envelope (заавал)

```typescript
// Success
{ success: true, data: { ... } }
// List
{ success: true, data: [...], meta: { total, page, limit, totalPages } }
// Error
{ success: false, error: { code, message, statusCode, details? } }
```

Global `TransformInterceptor` + `AllExceptionsFilter`-ээр автомат боогдоно.

## HTTP Status

| Нөхцөл | Status |
|---|---|
| GET / PATCH / DELETE OK | 200 |
| POST үүсгэв | 201 |
| Validation алдаа | 400 |
| Unauthorized | 401 |
| Tier хүрэлцэхгүй | 403 |
| Олдсонгүй | 404 |
| Idempotent duplicate | 200 (flag-тай) |
| Concurrent conflict | 409 |
| Rate limit | 429 |
| Server | 500 |
| Provider (Bonum) алдаа | 502 |
| Cabinet offline | 503 |

## DTO

`class-validator` + `class-transformer` ашиглана:

```typescript
export class TopupWalletDto {
  @IsInt() @Min(5000)
  @Transform(({ value }) => parseInt(value, 10))
  amount: number  // MNT integer
}

export class StartRentalDto {
  @IsUUID() cabinetId: string
  @IsString() @IsNotEmpty() slotId: string
}
```

## Pagination

```typescript
export class PaginationDto {
  @IsOptional() @Min(1) @Transform(...) page = 1
  @IsOptional() @Min(1) @Max(100) @Transform(...) limit = 20
}
```

## Naming

- URL: `kebab-case` → `/api/v1/power-banks`, `/api/v1/wallet/transactions`
- Body / query: `camelCase`
- Error code: `SCREAMING_SNAKE`
- Versioning: `/api/v1/...`

## Controller

Controller = HTTP layer л. Бизнес логик service-д.

```typescript
@Controller('wallet') @UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('topup')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async topup(@CurrentUser() user: AuthUser, @Body() dto: TopupWalletDto) {
    const invoice = await this.walletService.createTopupInvoice(user.id, dto.amount)
    return { success: true, data: invoice }
  }
}
```

## Error Code (тогтмол)

| Code | Status | UI текст |
|---|---|---|
| `VALIDATION_FAILED` | 400 | "Оруулсан мэдээлэл буруу байна" |
| `INSUFFICIENT_BALANCE` | 400 | "Wallet үлдэгдэл хүрэлцэхгүй байна" |
| `UNAUTHORIZED` | 401 | "Нэвтрэх шаардлагатай" |
| `TIER_REQUIRED` | 403 | "Иргэний баталгаажуулалт (DAN) шаардлагатай" |
| `RENTAL_NOT_FOUND` | 404 | "Түрээс олдсонгүй" |
| `SLOT_UNAVAILABLE` | 409 | "Энэ слот ашиглагдаж байна" |
| `ACTIVE_RENTAL_EXISTS` | 409 | "Та нэг power bank түрээслэсэн байна" |
| `BONUM_PROVIDER_ERROR` | 502 | "Төлбөрийн үйлчилгээнд түр асуудал гарлаа" |
| `CABINET_OFFLINE` | 503 | "Станц түр ажиллахгүй байна" |

## OpenAPI

`@ApiTags`, `@ApiOperation`, `@ApiResponse`, DTO-д `@ApiProperty`. `/api/docs` production-аас идэвхгүй.
