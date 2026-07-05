# Soie Clinic — Architecture

## Overview

A single Next.js 15 (App Router, strict TypeScript) application serves
both halves of the product:

1. The **marketing site** lives in `/public` as plain static files. It is
   byte-identical to the original hand-crafted site and keeps its URLs
   (`next.config.mjs` rewrites `/` to `/index.html`). Nothing in the app
   layer can break it.
2. The **application** (auth, booking, account, admin) is server-rendered
   React backed by API route handlers, PostgreSQL and Prisma.

Layering inside `src/`:

```
app/            routes only (pages + API handlers); thin controllers
  (auth)/       login / register / forgot / reset pages
  account/      patient area
  admin/        staff dashboard
  api/          JSON endpoints; every handler = guard → validate → service → audit
components/     reusable UI (shell, dialogs, charts, forms)
lib/            the actual business logic ("services" layer)
  slots.ts        scheduling engine
  reports.ts      financial aggregation
  appointments-admin.ts  completion + commission flow
  session/csrf/rate-limit/passwords/http  security plumbing
  db.ts           Prisma singleton
prisma/         schema, migrations, seed
```

## Database

PostgreSQL, 20 models (see `prisma/schema.prisma`). Key decisions:

- **Money = integer piasters** (EGP × 100). No floats anywhere near
  finance.
- **Revenue is derived, never stored**: every incoming pound is a
  `Payment` row (linked to an appointment or a product sale). Reports
  aggregate payments; there is no "revenue" table to drift out of sync.
- **Admins are Users** with `role = ADMIN` (RBAC enum: PATIENT, DOCTOR,
  STAFF, ADMIN), so adding staff roles later costs nothing.
- **Doctor schedules**: one row per working weekday
  (`weekday, startMinute, endMinute`); absence of a row = day off.
- **Inventory** is event-sourced-lite: `Product.stockQty` is the fast
  read model, every change also writes a `StockMove` (purchase / sale /
  adjustment / return) for a full audit trail.
- Deletes of doctors/services/products with history **degrade to
  deactivation** so past appointments, payments and reports stay intact.

## Scheduling engine (`lib/slots.ts`)

- The grid = doctor's working block for that weekday, stepped by
  `slot_step_minutes` (Settings, default 30), fitted to the service
  duration.
- All storage is UTC; the grid is computed in the clinic timezone
  (`Africa/Cairo`) with a DST-safe conversion (`lib/tz.ts`).
- A slot is bookable when it fits the block, is ≥ 60 minutes from now,
  within a 60-day horizon, and overlaps no PENDING/CONFIRMED
  appointment.
- **Double-booking is prevented twice**: the request re-validates
  against the live grid, then re-checks conflicts *inside a
  SERIALIZABLE transaction* (with one retry on serialization failure).
  Two concurrent clients cannot both win the same slot.
- Statuses: PENDING → CONFIRMED → COMPLETED, plus CANCELLED, NO_SHOW,
  RESCHEDULED. A reschedule marks the old row RESCHEDULED and links the
  replacement via `rescheduledFromId`, so history forms a chain.
- Patient rules: cancel/reschedule up to 12 h before start
  (`lib/constants.ts`); the clinic can always act via the admin API.

## Financial flows

- **Completing an appointment** (admin) records the `Payment` and, when
  the visit was referred by a doctor, writes a `CommissionEntry` at the
  doctor's `commissionPct` — inside one transaction
  (`lib/appointments-admin.ts`).
- **Product sales** create `ProductSale` + `Payment` + stock decrement +
  `StockMove` atomically.
- **Payroll** (`/api/admin/salaries`): net = base salary + bonus +
  auto-summed month commissions − deductions; `SalaryRecord` is unique
  per doctor/month and can be marked paid.
- **Net profit** for a period = payments − expenses − commissions −
  salaries paid (see `lib/reports.ts`).

## Security model

- **Sessions**: HS256 JWT (7 days) in an HttpOnly, SameSite=Lax,
  Secure-in-production cookie. Rotating `AUTH_SECRET` invalidates all
  sessions.
- **CSRF**: double-submit cookie (`soie_csrf` + `x-csrf-token` header)
  enforced on every mutating endpoint.
- **RBAC**: middleware protects `/account` and `/admin` pages; every API
  handler independently enforces `requireSession`/`requireRole` and
  returns JSON errors (no redirect leaks).
- **Rate limiting**: sliding window per IP (and per target account for
  login) on auth, booking and contact endpoints. In-memory store —
  swap for Redis when running multiple instances; call sites are
  unchanged.
- **Input validation**: zod schemas on every body; Prisma parameterises
  all SQL (no string concatenation anywhere).
- **XSS**: React escaping everywhere in the app; the static site has no
  user-generated content. Security headers (frame deny, nosniff,
  referrer policy, permissions policy) ship on every response.
- **Passwords**: bcrypt cost 12. Reset/verification tokens are random
  256-bit values stored only as SHA-256 hashes, single-use, expiring.
- **Audit log**: every auth event and admin mutation writes an
  `AuditLog` row (actor, action, entity, IP); viewer at `/admin/audit`.
- **Uploads**: type allow-list (JPEG/PNG/WebP), 3 MB cap, random
  filenames, admin-only.

## Email

`lib/mailer.ts` is the single integration point. Without SMTP
configuration it logs messages to the server console so every flow
(booking confirmations, password reset, verification) is testable in
development. Wire a provider inside `deliver()` for production.

## Scaling path

- Multi-clinic: add a `Clinic` model, foreign-key doctors/services/
  appointments/settings to it, scope queries by clinic — the service
  layer already funnels through `lib/`, so the change is localised.
- Online payments: `Payment.method`/`status` already model the ledger;
  a gateway integration adds a webhook that creates/updates payments.
- Horizontal scale: replace the in-memory rate limiter with Redis and
  serve uploads from object storage; everything else is stateless.
