# AMMOO ARCADE — Backend API

NestJS 10 + Prisma 5 + Supabase backend for the AMMOO ARCADE marketplace.

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20, TypeScript strict |
| Framework | NestJS 10 |
| ORM | Prisma 5 (Supabase Postgres) |
| Auth | Supabase Auth (JWT HS256, validated via Passport-JWT) |
| Storage | Supabase Storage (service role key, bypasses RLS) |
| Docs | Swagger/OpenAPI at `/api/docs` |

---

## Prerequisites

- Node.js 20+
- A Supabase project with:
  - Auth enabled (email/password)
  - A Postgres database (via pooler in **Session mode** for migrations)
  - A storage bucket named `ammoo-arcade`

---

## Setup

1. Copy the example env file and fill in values:

```bash
cp .env.example .env
```

Required variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Supabase pooler connection string (port 6543, `pgbouncer=true`) |
| `DIRECT_URL` | Supabase direct connection (port 5432, Session mode) — used for migrations |
| `SUPABASE_URL` | Your project URL (`https://<ref>.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypasses RLS) — keep secret |
| `SUPABASE_JWT_SECRET` | JWT secret from Supabase dashboard → Settings → API |
| `FRONTEND_URL` | Frontend origin for CORS (e.g. `http://localhost:3000`) |
| `ADMIN_EMAIL` | Email address auto-elevated to `admin` role on first login |
| `PORT` | HTTP port (default `3001`) |

2. Run Prisma migrations (requires `DIRECT_URL`):

```bash
npx prisma migrate deploy
```

3. Install dependencies and start:

```bash
npm install
npm run start:dev   # development (watch mode)
npm run build       # production build
npm run start:prod  # production
```

---

## API Modules

| Module | Prefix | Description |
|---|---|---|
| Auth | `/auth` | `GET /me`, `PUT /me`, `PUT /me/role` |
| Products | `/products` | CRUD, image upload, approval flow |
| Shops | `/shops` | Shop profile, pending changes |
| Cart | `/cart` | Add/update/remove/clear items |
| Orders | `/orders` | Place orders, OMS state machine |
| Payouts | `/payouts` | Bank details, payout requests, wallet |
| Notifications | `/notifications` | Read/unread, mark read |
| Wishlist | `/wishlist` | Add/remove/list |
| Admin | `/admin` | Products, shops, orders, settings, banners |

Full interactive docs: **`/api/docs`**

---

## Auth Flow

1. Frontend signs in/up via **Supabase Auth** client — gets a JWT access token.
2. Frontend sends `Authorization: Bearer <access_token>` on every API request.
3. NestJS Passport-JWT strategy validates the token against `SUPABASE_JWT_SECRET`.
4. On first request, a `Profile` row is auto-created (`name` pulled from `user_metadata`).
5. If the email matches `ADMIN_EMAIL`, the profile's role is elevated to `admin`.

Roles: `customer | seller | admin`

---

## Platform Fee

Orders deduct **10%** platform fee from seller revenue.
Wallet balance = sum of completed `OrderItem` revenue × 0.90.

---

## File Uploads

Files are uploaded to Supabase Storage bucket `ammoo-arcade` via the `StorageModule`.
Public URLs are stored in the database. The service role key bypasses RLS.

---

## Development Notes

- `DatabaseURL` must use **Session mode** (port 5432) for `npx prisma migrate` to work. Pooler Transaction mode does not support DDL statements.
- `Prisma.DbNull` is used to explicitly null out JSON fields (vs JavaScript `null`).
- Cart duplicate detection is done in the service layer because `NULL != NULL` in SQL unique constraints.
