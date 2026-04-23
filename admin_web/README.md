# Power Bank Admin Web

`admin_web` нь power bank rental системийн admin panel MVP.

Хэрэгжсэн үндсэн хэсгүүд:

- OTP-д суурилсан admin login (`x-client-type: admin`)
- Protected app shell, sidebar navigation, logout
- Dashboard overview
- Stations CRUD
- Users list/detail
- Rentals list/detail
- Payments list/detail
- Wallet transactions list
- Power banks list/detail
- `shadcn/ui`-д тулгуурласан shared primitive layer

## Tech Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- TanStack Query
- TanStack Table
- React Hook Form + Zod
- Recharts

## Prerequisites

- Node.js `24.15.0` эсвэл түүнээс дээш
- `nvm use` ашиглах бол repo доторх `.nvmrc`-ийг хэрэглэнэ

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

`npm run build` нь `--webpack` ашигладаг. Энэ нь одоогийн machine/toolchain дээр Next 16 build-ийг тогтвортой байлгах зорилготой.

## Project Notes

- Session нь browser local storage-д хадгалагдана
- API response envelope нь backend-ийн `success/data` contract-т тааруулсан
- Route detail page-үүд нь React Query ашиглан client-side fetch хийдэг
- Visual primitive-үүд `src/components/ui` дотор `shadcn/ui` pattern-аар байрлаж байгаа
