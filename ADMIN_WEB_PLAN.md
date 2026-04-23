# Admin Web Project Plan

> **Баримтын зорилго:** `admin_web` төслийг backend-ийн одоогийн admin API-ууд дээр тулгуурлан үе шаттай хэрэгжүүлэх төлөвлөгөөг тодорхойлох.

---

## 1. Зорилго

`admin_web` нь power bank rental системийн удирдлагын веб самбар байна. Энэхүү самбараар админ хэрэглэгчид дараах үндсэн үйлдлүүдийг хийнэ:

- Системийн ерөнхий үзүүлэлт харах
- Station-уудыг удирдах
- Хэрэглэгчдийн мэдээлэл харах
- Rental урсгалыг хянах
- Payment болон wallet transaction-уудыг шалгах
- Power bank-ийн төлөв, ашиглалтыг хянах

---

## 2. Одоогийн backend readiness

Backend талд дараах admin API-ууд аль хэдийн бэлэн байгаа:

- `GET /admin/dashboard/overview`
- `GET /admin/dashboard/payments`
- `GET /admin/dashboard/payments/:id`
- `GET /admin/dashboard/wallet/transactions`
- `GET /admin/dashboard/users`
- `GET /admin/dashboard/users/:id`
- `GET /admin/dashboard/rentals`
- `GET /admin/dashboard/rentals/:id`
- `GET /admin/dashboard/power-banks`
- `GET /admin/dashboard/power-banks/:id`
- `GET /admin/stations`
- `POST /admin/stations`
- `PATCH /admin/stations/:id`
- `DELETE /admin/stations/:id`

Auth талд admin audience support бэлэн бөгөөд `x-client-type: admin` ашиглан admin token авах боломжтой.

---

## 3. MVP Scope

Эхний хувилбарт дараах хэсгүүд орно:

### 3.1 Auth

- Admin login
- Access token / refresh token management
- Protected routes
- 401 / 403 error handling

### 3.2 Dashboard

- Overview cards
- Station health summary
- Rental summary
- Payment summary
- Wallet summary

### 3.3 Stations

- Station list
- Station create
- Station update
- Station delete

### 3.4 Users

- User list
- User detail
- Search and pagination

### 3.5 Rentals

- Rental list
- Rental detail
- Status filter

### 3.6 Payments

- Payment list
- Payment detail
- Status/date filter

### 3.7 Wallet Transactions

- Wallet transaction list
- Type/date filter
- User-based filtering

### 3.8 Power Banks

- Power bank list
- Power bank detail
- Status filter

---

## 4. Санал болгож буй tech stack

- `Next.js`
- `TypeScript`
- `App Router`
- `Tailwind CSS`
- `shadcn/ui`
- `TanStack Query`
- `TanStack Table`
- `React Hook Form`
- `Zod`
- `Recharts`
- `Axios` эсвэл native fetch wrapper

### Яагаад энэ стек тохиромжтой вэ

- Dashboard төрлийн protected web app-д хурдан development хийхэд тохиромжтой
- Layout, route protection, form validation хийхэд хялбар
- API integration болон server/client boundary тодорхой
- Ирээдүйд deploy, scaling хийхэд хүндрэл багатай

### UI framework decision

`admin_web` төсөлд UI framework ашиглана. Санал болгож буй хослол:

- `Tailwind CSS` — суурь styling system
- `shadcn/ui` — button, dialog, form, sheet, dropdown, table wrapper зэрэг reusable UI component
- `TanStack Table` — data-dense admin list/table хэсгүүдэд
- `Recharts` — dashboard summary/chart хэсэгт

### Яагаад энэ сонголт зөв вэ

- Admin panel-д олон давтагдах UI элемент хэрэгтэй тул хөгжүүлэлтийн хурд нэмэгдэнэ
- Дизайн consistency хадгалахад амар болно
- `shadcn/ui` нь repo дотор component code авчирдаг тул custom хийхэд хялбар
- `MUI` эсвэл `Ant Design`-аас илүү lightweight бөгөөд existing brand style-д уян хатан

---

## 5. Project structure санал

```text
admin_web/
  src/
    app/
    features/
      auth/
      dashboard/
      stations/
      users/
      rentals/
      payments/
      wallet/
      power-banks/
    shared/
      api/
      ui/
      lib/
      config/
      types/
  public/
  .env.local
  package.json
  tsconfig.json
```

---

## 6. Кодын стандарт ба component strategy

### 6.1 Кодын стандарт

- `TypeScript strict mode` заавал ашиглах
- `ESLint + Prettier`-ээр format болон code quality-г тогтмол барих
- Feature-based folder structure ашиглах
- API request/response type-уудыг central type layer-д хадгалах
- Form validation бүрт `Zod` schema ашиглах
- Hardcoded string, color, spacing, status mapping-ийг component дотор тараахгүй, shared constant/config руу төвлөрүүлэх
- Нэг хуудсан дээр хэт их логик бөөгнөрүүлэхгүй, page-level orchestration болон UI component-уудыг салгах
- Loading, empty, error state-уудыг нэгдсэн хэв маягаар хэрэгжүүлэх

### 6.2 Reusable component strategy

Олон давтагдах UI болон behavior-уудыг дахин ашиглах component/service хэлбэрт оруулна.

Жишээ нь:

- `AppShell`
- `PageHeader`
- `StatCard`
- `DataTable`
- `FilterBar`
- `SearchInput`
- `StatusBadge`
- `EmptyState`
- `ErrorState`
- `ConfirmDialog`
- `FormField`
- `Pagination`
- `DateRangeFilter`
- `LoadingSpinner`

### 6.3 Reusable logic

- Auth/session management
- API client wrapper
- Query key factory
- Error parser
- Date formatter
- Currency formatter
- Status label mapper
- Permission guard helper

### 6.4 Зорилго

- Давтагдсан код багасгах
- UI consistency хадгалах
- Feature нэмэх хурдыг өсгөх
- Maintenance болон bug fix-ийг хялбар болгох

---

## 7. Хөгжүүлэлтийн үе шат

### Phase 1 — Planning and Setup

- Scope-ийг эцэслэх
- Tech stack батлах
- `admin_web` scaffold үүсгэх
- `Tailwind CSS`, `shadcn/ui`, `TanStack Table`, `Recharts` суулгах
- Env болон API base URL тохируулах
- Lint, format, typecheck тохируулах

### Phase 2 — Auth and App Shell

- Login page хийх
- Token handling стратеги хэрэгжүүлэх
- Protected layout үүсгэх
- Sidebar, header, navigation хийх
- Common loading/error state бэлтгэх
- Reusable shell болон shared UI component-уудын эхний санг гаргах

### Phase 3 — Dashboard Overview

- Overview API холбох
- KPI card-ууд гаргах
- Station, rental, payment summary section хийх
- Empty/failure state боловсруулах

### Phase 4 — Stations Management

- Station list page
- Create/edit modal эсвэл form page
- Delete confirmation
- API mutation handling

### Phase 5 — Monitoring Sections

- Users list/detail
- Rentals list/detail
- Payments list/detail
- Wallet transactions list
- Power banks list/detail
- Давтагдах table/filter/detail pattern-уудыг shared component дээр тулгуурлан хэрэгжүүлэх

### Phase 6 — UX and Stability

- Table filters, pagination, search polish хийх
- Global notification/toast нэмэх
- Basic responsive behavior сайжруулах
- Error boundary болон retry logic нэмэх

### Phase 7 — QA and Release Prep

- Smoke test checklist
- Basic component/integration tests
- README болон env setup бичих
- Staging deploy бэлтгэх

---

## 8. 14 хоногийн MVP timeline

### Day 1-2

- Scope finalize
- Project scaffold
- UI foundation

### Day 3-4

- Login
- Auth session handling
- Protected route

### Day 5-6

- Dashboard overview
- Shared layout/components

### Day 7-8

- Stations CRUD

### Day 9-10

- Users
- Rentals

### Day 11-12

- Payments
- Wallet transactions
- Power banks

### Day 13-14

- QA
- Bug fix
- Staging preparation

---

## 9. Deliverables

- `admin_web` source code
- Admin auth flow
- Dashboard MVP screens
- Backend API integration
- Reusable shared component library
- Shared utility/helper layer
- Environment setup guide
- Build/deploy instruction

---

## 10. Эрсдэл ба анхаарах зүйлс

- Admin login UX-г backend auth flow-той яг тааруулах шаардлагатай
- Refresh token хадгалалтын стратеги эхэндээ зөв шийдэгдэх ёстой
- Зарим list endpoint-ууд pagination/filter capability-аар дараа нь өргөтгөл шаардаж магадгүй
- Realtime station health хэрэгтэй бол дараагийн шатанд polling эсвэл websocket шийдэл нэмэх хэрэгтэй

---

## 11. Дараагийн алхам

1. `admin_web` tech stack-ийг эцэслэх
2. Folder scaffold үүсгэх
3. Shared coding standard болон component rule-ийг bootstrap үед батлах
4. Auth flow-г эхэлж хэрэгжүүлэх
5. Dashboard overview page-аас MVP хөгжүүлэлтийг эхлүүлэх
