# Customer Web Project Plan

> **Баримтын зорилго:** `PowerGo Mobile App - Standalone.html` болон `MOBILE_APP_STRUCTURE.md` дээрх consumer flow-уудыг native app биш, responsive web бүтээгдэхүүн болгох implementation төлөвлөгөөг тодорхойлох.

---

## 1. Зорилго

`customer_web` нь power bank түрээсийн эцсийн хэрэглэгчид зориулсан веб бүтээгдэхүүн байна. Энэ веб нь mobile app mockup-ийн үндсэн хэрэглээг хадгална:

- Ойролцоох station олох
- Station map/list/detail үзэх
- Wallet цэнэглэх
- QR кодоор түрээс эхлүүлэх
- Идэвхтэй түрээсээ хянах
- Return station олох
- Түрээсийн түүх, profile харах

Зорилго нь mobile design-ийг браузер дээр шууд сунгах биш, харин brand ба core flow-уудыг хадгалсан responsive web experience болгох юм.

---

## 2. Design-оос уншигдсан гол signal

Standalone design нь дараах screen-үүдийг төв болгосон mobile-first prototype байна:

- Home
- Stations Map
- Stations List
- Station Detail
- QR Scan
- Rent Confirmation
- Active Rental
- Receipt
- Wallet
- Rental History

Visual direction:

- Light theme first
- Bright blue brand palette
- `Manrope` төрлийн clean sans typography
- Өндөр radius-тай card-ууд
- Wallet hero card
- Global active rental sticky banner
- Center-focused QR action
- Map + inventory + wallet гэсэн 3 utility signal маш тод

Web хийхдээ дараах mobile-only элементүүдийг шууд хуулж болохгүй:

- Device frame
- Fixed bottom nav-only navigation
- Full-screen camera-first scan flow
- Narrow single-column dependency

Харин дараах design intent-ийг заавал хадгална:

- Wallet үлдэгдэл хамгийн тод signal байх
- Station discovery map/list/detail хамгийн хүчтэй flow байх
- Active rental global context байх
- QR start flow 2-3 алхмаас ихгүй байх

---

## 3. Санал болгож буй бүтээгдэхүүний хүрээ

### 3.1 Positioning

`customer_web` нь hybrid байдлаар ажиллана:

- Mobile browser дээр app-like experience
- Tablet/Desktop дээр responsive utility dashboard

### 3.2 Вэбийн navigation strategy

Mobile:

- Доод fixed navigation хадгалж болно
- `Home / Stations / Scan / Wallet / Profile`

Tablet/Desktop:

- Top header + primary nav
- Global sticky active rental banner
- Page-level secondary actions

### 3.3 Layout strategy

Home:

- Mobile дээр single column
- Desktop дээр `wallet + quick actions` зүүн талд, `map + nearby stations` баруун талд

Stations:

- Mobile дээр `Map/List` toggle
- Desktop дээр split-view: зүүн талд list, баруун талд map

Station detail:

- Mobile дээр stacked section
- Desktop дээр 2 column: info/inventory + map/actions

Wallet:

- Mobile дээр card stack
- Desktop дээр balance summary + top-up + transaction preview гэсэн 2 column

Active rental:

- Mobile дээр dedicated page
- Desktop дээр dedicated page + global sticky summary

QR scan:

- Mobile web: camera scan
- Desktop web: manual QR input эсвэл QR зураг upload fallback

---

## 4. Архитектурын санал

### 4.1 App structure

Consumer-facing web-ийг одоогийн `admin_web` дотор шингээхгүй. Тусдаа `customer_web` app болгоно.

Яагаад:

- Admin shell ба customer shell-ийн auth, routing, visual language өөр
- Admin panel нь data-dense back-office UI, харин customer web нь branded consumer UI
- Future deploy, domain, SEO, session policy-г тусад нь удирдахад амар

### 4.2 Tech stack

Одоогийн `admin_web` stack-ийг суурь болгон давтана:

- `Next.js 16 App Router`
- `TypeScript`
- `Tailwind CSS v4`
- `TanStack Query`
- `React Hook Form + Zod`

Нэмэлт санал:

- Browser QR scanning library
- Map integration wrapper
- PWA installability-г Phase 2-оос хойш авч үзэх

### 4.3 Shared code strategy

`admin_web`-оос яг UI-г copy хийхгүй. Харин дараах зарчмыг reuse хийнэ:

- API client pattern
- Env config pattern
- Query/state management pattern
- Auth token storage strategy
- Format helpers

Хэрэв 2 app-д давхардсан код ихэсвэл дараа нь shared package руу гаргана. Эхний MVP дээр force share хийх хэрэггүй.

---

## 5. Санал болгож буй route map

```text
/
/login
/otp
/home
/stations
/stations/[stationId]
/scan
/wallet
/wallet/transactions
/rental/active
/rental/history
/rental/[rentalId]/return
/rental/[rentalId]/receipt
/profile
```

Notes:

- `/` нь marketing/entry эсвэл auth-aware redirect байж болно
- `/scan` нь mobile дээр camera, desktop дээр fallback UI үзүүлнэ
- Active rental байвал header дээрээс бүх page-ээс нээгдэх ёстой

---

## 6. MVP scope

### Phase 1 MVP-д заавал орох хэсэг

- OTP auth
- Home summary
- Stations map/list
- Station detail
- Wallet summary + top-up
- QR resolve + rental preview
- Rental start
- Active rental
- Return station picker
- Receipt
- Rental history
- Read-only profile

### MVP-ээс хойш оруулах хэсэг

- Google sign-in
- DAN verification web callback
- Notifications center
- Favorite stations
- Promo/news module
- Multi-language toggle

---

## 7. Screen-ээс веб рүү хөрвүүлэх дүрэм

### 7.1 Home

Design intent:

- Greeting
- Wallet hero
- Quick actions
- Nearby stations
- Map preview
- Active rental sticky

Web implementation:

- Desktop дээр wallet hero-г left rail болгох
- Nearby stations + map preview-г fold-оос дээш гаргах
- Quick actions-ийг icon grid биш, compact CTA row болгох

### 7.2 Stations

Design intent:

- Map + list toggle
- Filters
- Station card дээр availability

Web implementation:

- Desktop split view default
- Mobile toggle хадгалах
- Filter bar sticky болгох
- Card click хийхэд map дээр highlight синк хийх

### 7.3 Station Detail

Design intent:

- Hero media
- Status + station meta
- Size inventory
- Map/address
- Primary CTA

Web implementation:

- Desktop дээр CTA хэсгийг sticky aside болгох
- Inventory-г table биш selection cards байдлаар хадгалах
- QR start болон return CTA-г эхний viewport дотор байрлуулах

### 7.4 Scan

Design intent:

- Camera-first flow
- Fast confirmation

Web implementation:

- Mobile web дээр camera permission flow
- Desktop дээр:
  - QR string paste
  - QR image upload
  - "Continue on phone" fallback

### 7.5 Wallet

Design intent:

- Balance hero
- Preset top-up
- Bonum payment

Web implementation:

- Preset amount buttons + custom amount input
- `followUpLink` ашигласан Bonum redirect/new tab flow
- Pending/success state polling

### 7.6 Active Rental / History

Design intent:

- Live rental context
- Timer
- Return CTA
- Receipt and history

Web implementation:

- Header sticky rental banner
- Active page дээр timer + cost + return stations
- History дээр filters + richer row cards/table hybrid

---

## 8. Backend readiness

Одоогийн backend дээр consumer web-ийн MVP-ийн суурь flow-уудын ихэнх нь байна:

- Auth OTP
- Home summary
- Nearby stations
- Station detail
- Wallet summary
- Wallet transactions
- Wallet top-up invoice
- QR resolve
- Rental preview
- Rental start / return
- Active rental
- Rental history
- Profile read

Тиймээс frontend-only prototype биш, real API-backed web хийх боломжтой.

---

## 9. Заавал хийх backend delta

### 9.1 Auth callback-ууд web-ready биш

Одоогийн Google болон DAN callback нь mobile deep link рүү redirect хийдэг.

Иймээс web дээр дараах 2 хувилбарын нэгийг сонгоно:

1. MVP дээр OTP-only auth хийх
2. Web callback URL болон web token exchange flow нэмэх

### 9.2 Token audience тодорхой биш

Одоогоор audience нь `mobile-app` ба `admin-panel` гэсэн 2 төрөлтэй.

Сонголт:

1. `customer_web` нь эхний хувилбарт `mobile-app` audience reuse хийх
2. Дараагийн алхамд `customer-web` audience нэмж салгах

MVP-д 1 дэх хувилбар илүү хурдан.

### 9.3 Station API design-ийн өгөгдлийг бүрэн хангахгүй

Design дээр station card/detail нь дараах мэдээлэл шаарддаг:

- `locationName`
- `online/offline` signal
- `supportsReturn`
- `inventory by size`
- `capacity`
- `connectorTypes`
- `priceBadge`

Одоогийн public station DTO нь үүнийг бүрэн өгөхгүй. Ялангуяа `nearby` response дээр by-size inventory байхгүй.

### 9.4 Power bank schema design-ийн size model-гүй

Одоогийн `PowerBank` model дээр дараах field байхгүй:

- size code / size label
- capacity
- connector types

Тиймээс design дээрх `S / M / L` inventory-г бодитоор ажиллуулах бол schema update хэрэгтэй.

### 9.5 Rental DTO customer UI-д ядуу байна

History болон active rental screen-д дараах display field-үүд хэрэгтэй:

- start station name
- end station name
- serial number
- size label
- duration
- estimated/current cost

Одоогийн rental DTO нь үндсэндээ ID ба financial base field-үүд л өгч байна.

### 9.6 Notifications API байхгүй

Design intent дээр notification entry байгаа ч backend endpoint харагдахгүй байна. MVP дээр placeholder эсвэл deferred scope болгоно.

---

## 10. Санал болгож буй backend change set

### B1. Consumer auth hardening

- Web callback URL support
- Optional `customer-web` audience
- Cookie эсвэл existing token storage strategy-ийн нэгийг батлах

### B2. Station model enrichment

- `locationName`
- `inventoryBySize`
- `pricing summary`
- `connectorTypes`
- `estimatedPhoneCharges`

### B3. Power bank metadata enrichment

- `sizeCode`
- `capacity`
- `connectorTypes`

### B4. Rental response enrichment

- Joined station names
- Power bank display metadata
- Cost/timer helper fields

### B5. Optional profile endpoints

- Profile update
- Verification status detail

---

## 11. Frontend implementation phase

### Phase 1 — Scaffold and shell

- `customer_web` app scaffold
- Base theme tokens
- Layout shell
- Responsive navigation
- Auth/session foundation
- API client wiring

### Phase 2 — Core discovery flow

- Home page
- Stations list/map
- Station detail
- Active rental sticky banner

### Phase 3 — Wallet and auth completion

- OTP screens
- Wallet summary
- Wallet transaction preview/list
- Top-up flow

### Phase 4 — Rental start flow

- Scan page
- QR resolve
- Rental preview/confirm
- Start rental success transition

### Phase 5 — Active rental and return flow

- Active rental page
- Return station picker
- Return confirmation
- Receipt page

### Phase 6 — History and profile

- Rental history
- Profile read-only
- Empty/error/loading states polishing

---

## 12. Implementation priority

Хамгийн зөв дараалал:

1. OTP + shell + session
2. Home + stations + detail
3. Wallet
4. QR start flow
5. Active rental + return
6. History + profile
7. OAuth / DAN / notifications

Энэ дараалал нь backend-ийн одоогийн readiness-тэй хамгийн сайн таарна.

---

## 13. Гол эрсдэл

- Design дээрх size-based inventory нь одоогийн schema/API-тай бүрэн таарахгүй
- QR scan desktop UX-ийг зөв fallback-гүй хийвэл conversion унаж болно
- Google/DAN web callback-гүй бол auth roadmap зогсоно
- Consumer UI-г `admin_web` style руу хэт ойртуулбал brand ялгарал алдагдана

---

## 14. Эцсийн санал

Хамгийн pragmatic зам нь:

1. `customer_web`-ийг тусдаа Next.js app болгох
2. MVP дээр OTP auth + mobile-app audience reuse хийх
3. Responsive web-ийг mobile-first боловч desktop-capable байдлаар хийх
4. Station/rental/power bank DTO-г consumer UI-д хэрэгтэй хэмжээнд баяжуулах
5. Google/DAN web callback-ийг MVP-ийн дараагийн phase руу шилжүүлэх

Ингэвэл mockup-ийн core UX-г алдахгүйгээр хамгийн хурдан production-grade web гаргах боломжтой.
