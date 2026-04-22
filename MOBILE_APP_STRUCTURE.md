# Power Bank Rental Mobile App Structure

> **Огноо:** 2026-04-21
> **Зориулалт:** Энэ баримт нь `BACKEND.md`, `PAYMENT.md`, `RESEARCH.md`, `INIT.md` дээр тулгуурласан, AI design tool-д өгөхөд бэлэн mobile app structure болон UX brief юм.
> **Анхаарах шинэ feature:** Power bank station бүр өөрийн `stationId`, `stationName`, `location` мэдээлэлтэй байна. Station бүр дотроо хэмжээ ангилалтай power bank inventory агуулна.

---

## 1. Product Summary

Энэ апп нь хэрэглэгчид ойролцоох power bank station-ийг олох, wallet цэнэглэх, QR код уншуулж түрээс эхлүүлэх, идэвхтэй түрээсээ хянах, дурын station-д буцаах боломж олгоно.

Системийн гол ялгарах хэсэг нь:

- Station map + list discovery
- Real-time station availability
- Wallet pre-load төлбөрийн урсгал
- QR scan ашигласан хурдан rental start
- Active rental tracking
- Station бүр дээр size-based power bank inventory харагдах

---

## 2. Design Goal

AI design tool нь дараах төрлийн consumer mobile app UI гаргах ёстой:

- Орчин үеийн, цэвэрхэн, итгэл төрүүлэх fintech + urban utility хэв маяг
- Mongolian хэрэглэгчдэд ойлгомжтой copy
- Газрын зураг, station availability, QR scan, wallet balance гэсэн 4 гол хэрэглээг маш тод харагдуулах
- Active rental байгаа үед app-ийн бүх гол дэлгэц дээр persistent status bar харагдах
- Station detail дээр station name, station ID, location, inventory by size, online/offline төлөв заавал харагдах

---

## 3. Core Product Model

### 3.1 User

- Phone OTP эсвэл Google sign-in
- Optional DAN verification
- Wallet balance
- Rental history
- Notification preferences

### 3.2 Station

Station нь хэрэглэгчийн хардаг физик rental point байна.
Эдгээр утгууд нь backend/admin талаас тохируулагдаж, mobile app дээр display хийгдэнэ.

Station metadata:

- `stationId`
- `stationName`
- `locationName`
- `address`
- `latitude`
- `longitude`
- `status`: `online | offline | maintenance`
- `distanceFromUser`
- `totalSlots`
- `availableSlots`
- `supportsReturn`: `true | false`

### 3.3 Power Bank

Power bank бүр station дотор slot-д байрлана.

Power bank metadata:

- `powerBankId`
- `serialNumber`
- `sizeCode`
- `sizeLabel`
- `capacity`
- `batteryLevel`
- `connectorTypes`
- `status`: `available | rented | charging | low_battery | faulty`

### 3.4 Power Bank Size Groups

Design нь дараах 3 size card-ийг харуулах байдлаар шийдэгдэж болно. Exact capacity нь backend-аас ирдэг configurable data байна.

| Size | Label | Capacity example | Use case |
|---|---|---|---|
| `S` | Mini | 5,000 mAh | Түргэн хэрэгцээ, хөнгөн |
| `M` | Standard | 10,000 mAh | Ихэнх хэрэглэгчид |
| `L` | Max | 20,000 mAh | Урт хэрэглээ, өндөр багтаамж |

Station бүр size group тус бүрийн үлдэгдлийг харуулна:

- `availableCount`
- `totalCount`
- `hourlyPrice` эсвэл `priceBadge`
- `estimatedPhoneCharges`

### 3.5 Wallet

- `balance`
- `frozenAmount`
- `availableBalance`
- `topupPresets`: `₮5,000`, `₮10,000`, `₮20,000`
- Transaction history

### 3.6 Rental

- `rentalId`
- `stationStartId`
- `stationStartName`
- `powerBankId`
- `sizeLabel`
- `startedAt`
- `elapsedTime`
- `estimatedCost`
- `depositFrozen`
- `returnEligibleStations`
- `status`: `pending | active | overdue | completed`

---

## 4. Primary Navigation

Bottom navigation 5 tab-тай байна:

1. `Home`
2. `Stations`
3. `Scan`
4. `Wallet`
5. `Profile`

Global elements:

- Active rental sticky banner
- Push notification entry
- Wallet quick balance chip
- Location permission prompt

---

## 5. App Structure

### 5.1 Splash / Launch

Purpose:

- Brand reveal
- Fast service positioning
- Auto session restore

Key content:

- Logo
- Tagline: `Ойролцоох station-оос power bank түрээслэ`
- Loading state

### 5.2 Onboarding

3 intro panel:

1. Nearby station олох
2. Wallet цэнэглээд QR scan хийх
3. Дурын station-д буцаах

CTA:

- `Эхлэх`
- `Нэвтрэх`

### 5.3 Auth

Auth methods:

- Phone OTP
- Google sign-in

Optional later step:

- DAN verification

UI blocks:

- Phone input
- OTP input
- Google button
- Trust notice

### 5.4 Home

Home нь utility dashboard байна.

Sections:

- Greeting + wallet balance
- Search bar
- Nearby stations horizontal cards
- Map preview
- Quick actions:
  - `QR уншуулах`
  - `Wallet цэнэглэх`
  - `Ойролцоох station`
- Promo / tip card
- Active rental card if exists

Home station card дээр:

- Station name
- Station ID
- Distance
- Location short label
- Availability summary
- Online/offline badge

### 5.5 Stations

Two modes:

- Map view
- List view

Filter options:

- Nearest
- Online only
- Return available
- Size filter: `Mini`, `Standard`, `Max`

List card content:

- `stationName`
- `stationId`
- `locationName`
- `address`
- Distance
- Open/online status
- Inventory chips by size
- `View details` CTA

Map pins:

- Green: available
- Yellow: low stock
- Gray: offline
- Blue outline: selected station

### 5.6 Station Detail

Энэ бол хамгийн чухал дэлгэцүүдийн нэг.

Header:

- Station name
- Station ID
- Online/offline status
- Distance
- Favorite/save icon

Location block:

- Full address
- Mini map
- `Navigate` CTA

Inventory block:

- Size cards for `S`, `M`, `L`
- Available count / total count
- Capacity label
- Connector icons
- Optional price badge
- Disabled state if size unavailable

Station meta:

- Total slots
- Return supported эсэх
- Last updated time

Primary actions:

- `QR уншуулаад түрээслэх`
- `Энэ station-д буцаах`

Secondary actions:

- `Share location`
- `Report issue`

### 5.7 QR Scan

Purpose:

- Station дээр очоод QR scan хийх

States:

- Camera permission request
- Scanner active
- QR success
- Invalid QR
- Station offline

Success after scan:

- Station name
- Station ID
- Detected slot or station context
- Available sizes summary
- Wallet check result

CTA:

- `Түрээс эхлүүлэх`

### 5.8 Rent Confirmation

Confirmation sheet or full screen:

- Selected station
- Selected size
- Deposit/frozen amount
- Hourly pricing note
- Wallet available balance
- Estimated rules:
  - time rounding
  - overdue note
  - return to any station if supported

Actions:

- `Баталгаажуулаад нээх`
- `Wallet цэнэглэх`

### 5.9 Wallet

Top area:

- Current balance
- Frozen amount
- Available balance

Actions:

- `Цэнэглэх`
- `Буцаан авах хүсэлт`
- `Гүйлгээ харах`

Top-up presets:

- `₮5,000`
- `₮10,000`
- `₮20,000`
- Custom amount input

Payment UX:

- Bonum QR
- Bank app deep link buttons
- Pending payment state
- Success animation

### 5.10 Active Rental

Persistent page and mini banner both хэрэгтэй.

Main content:

- Power bank image
- Size label
- Capacity
- Rental start station
- Started time
- Live timer
- Estimated current cost
- Deposit frozen
- Battery / device usage tip

Actions:

- `Буцаах station олох`
- `Support`

Map module:

- Nearby return stations
- Capacity acceptance / available slot state

### 5.11 Return Flow

Return station selection:

- Nearby stations list
- Map
- Only return-enabled stations

Return confirmation:

- Target station
- Station ID
- Empty slot availability
- Return instructions

After successful return:

- Final cost
- Frozen amount release
- Receipt summary
- `Дууслаа`

### 5.12 Rental History

List item:

- Date
- Start station
- Return station
- Power bank size
- Duration
- Total cost
- Status

Filters:

- Active
- Completed
- Overdue

### 5.13 Notifications

Notification types:

- Wallet top-up success
- Rental started
- Return reminder
- Overdue warning
- DAN verification success
- Promo/news

### 5.14 Profile

Sections:

- User info
- Verification status
- Payment/wallet shortcuts
- Language
- Help center
- Terms & privacy
- Logout

Verification card:

- `Basic`
- `Verified`
- `Corporate`

CTA:

- `Иргэний баталгаажуулалт хийх`

---

## 6. Key User Flows

### 6.1 First-Time User

1. Splash
2. Onboarding
3. Auth
4. Location permission
5. Home
6. Wallet top-up
7. Station discovery
8. QR scan
9. Rent confirmation
10. Active rental
11. Return
12. Receipt

### 6.2 Returning User

1. Open app
2. See nearby stations + wallet balance
3. Scan QR
4. Start rental in a few taps

### 6.3 Low Balance Flow

1. User scans station QR
2. App checks `availableBalance`
3. If insufficient, open wallet top-up sheet
4. Complete Bonum QR payment
5. Resume rental confirmation automatically

### 6.4 Return Flow

1. User opens active rental
2. Finds nearest return station
3. Chooses station
4. Returns power bank
5. Gets receipt and updated wallet state

---

## 7. Station-Centric UI Requirements

AI design tool заавал дараахыг тусгах ёстой:

- Station list card бүр дээр `stationName`, `stationId`, `locationName` харагдах
- Station detail дээр full address + mini map харагдах
- Inventory нь size-by-size card эсвэл row байдлаар харагдах
- Size бүр дээр `available / total` илэрхий байх
- Station төлөв нь шууд ялгарах badge-тэй байх
- User map дээрээс station сонгоход bottom sheet detail гарч ирэх
- Offline station-ууд interaction багатай, gray state-тэй байх
- Return хийх боломжтой station-ууд тусдаа icon эсвэл badge-тэй байх

---

## 8. Suggested Components

- Station card
- Station map pin
- Availability chip
- Size selector chip
- Wallet balance card
- Active rental banner
- Rental timer card
- QR scanner frame
- Payment method sheet
- Receipt card
- Verification tier badge

---

## 9. States To Design

Screen бүр дээр дараах state-уудыг бодож зураглах:

- Loading
- Empty
- Error
- Success
- Offline
- Permission denied
- Low wallet balance
- Station offline
- No power bank available for selected size
- No return slot available
- Rental overdue

---

## 10. Recommended UI Copy Direction

Tone:

- Товч
- Найдвартай
- Хэт техникийн биш
- Utility-first

Example labels:

- `Ойролцоох station`
- `QR уншуулах`
- `Wallet цэнэглэх`
- `Түрээс эхлүүлэх`
- `Буцаах station олох`
- `Идэвхтэй түрээс`
- `Баталгаажуулалт хийх`
- `Станц offline байна`
- `Энэ хэмжээ одоогоор дууссан`

---

## 11. Example Station Data For Mockup

```json
{
  "stationId": "ST-UB-001",
  "stationName": "Shangri-La Lobby Station",
  "locationName": "Сүхбаатар дүүрэг",
  "address": "Shangri-La Center, 1 давхар",
  "latitude": 47.9145,
  "longitude": 106.9176,
  "status": "online",
  "distanceFromUser": 180,
  "supportsReturn": true,
  "inventoryBySize": [
    {
      "sizeCode": "S",
      "sizeLabel": "Mini",
      "capacity": "5,000 mAh",
      "availableCount": 2,
      "totalCount": 4
    },
    {
      "sizeCode": "M",
      "sizeLabel": "Standard",
      "capacity": "10,000 mAh",
      "availableCount": 5,
      "totalCount": 8
    },
    {
      "sizeCode": "L",
      "sizeLabel": "Max",
      "capacity": "20,000 mAh",
      "availableCount": 1,
      "totalCount": 2
    }
  ]
}
```

---

## 12. AI Design Output Request

Энэ document дээр тулгуурлаад AI design tool дараах deliverable гаргавал тохиромжтой:

- 10-14 mobile screens
- iOS/Android friendly layout
- Light theme first
- Station map + list + detail screen-үүдийг өндөр нягтралтай
- Wallet top-up болон active rental flow-г бүрэн
- Mongolian UI copy ашигласан prototype
- Component consistency бүхий design system starter

Priority screens:

1. Home
2. Stations Map/List
3. Station Detail
4. QR Scan
5. Rent Confirmation
6. Wallet Top-Up
7. Active Rental
8. Return Station Picker
9. Receipt
10. Profile / Verification

---

## 13. Summary

Энэ mobile app-ийн төв цөм нь `station discovery + wallet + QR rental + active rental + return flow` байна. Шинэ feature-ийн хувьд station бүрийн `name`, `id`, `location`, мөн `size-based power bank inventory` нь UI-ийн гол мэдээлэл болж харагдах ёстой.

Хэрэв AI design tool энэ document-ийг prompt болгон ашиглавал station-centric, real-time, utility-first mobile experience гаргахуйц хангалттай бүтэцтэй байна.
