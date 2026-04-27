# PowerGo Customer Web

`customer_web` нь PowerGo power bank rental системийн хэрэглэгчийн веб frontend.

Одоогоор хэрэгжсэн үндсэн хэсгүүд:

- Phone OTP login
- Responsive customer shell
- Home summary
- Stations map/list/detail
- Wallet summary + top-up invoice flow
- Camera QR scan + image/manual fallback
- Rental start flow
- Active rental
- Return station picker
- Receipt
- Rental history
- Profile

## Tech Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS v4
- TanStack Query
- shadcn/ui primitives

## Prerequisites

- Node.js `24.15.0` эсвэл түүнээс дээш

## Environment

```bash
cp .env.example .env.local
```

Шаардлагатай хувьсагч:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
```

## Run

```bash
nvm use
npm install
npm run dev
```

Default URL: `http://localhost:3000`

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run start
```

## Notes

- Session нь browser local storage-д хадгалагдана
- API response envelope нь backend-ийн `success/data` contract-т тааруулсан
- `build` нь `--webpack` ашигладаг
- Camera QR scan нь browser-ийн `BarcodeDetector` болон `getUserMedia` support дээр тулгуурлана
