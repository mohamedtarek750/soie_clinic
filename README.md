# Soie Clinic — Website & Clinic Management System

Luxury aesthetic clinic in New Cairo & Mohandseen. One repository, two
faces:

- **Marketing site** — the original hand-crafted static site (HTML/CSS/JS),
  served unchanged from `/public` at the same URLs it always had.
- **Clinic management system** — a Next.js 15 + TypeScript application
  wrapped around it: PostgreSQL via Prisma, JWT auth in HttpOnly cookies,
  a real scheduling engine, patient accounts and a full admin dashboard.

## Quick start (development)

```bash
npm install
cp .env.example .env          # then edit values (AUTH_SECRET at minimum)

npm run db:dev                # terminal 1: local PostgreSQL (embedded, ./.pgdata)
npm run db:migrate            # terminal 2: apply migrations
npm run db:seed               #             admin account + doctors + services
npm run dev                   #             app on http://localhost:3000
```

Seed admin: `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `.env`
(change them before seeding; change the password after first login).

## Production

Point `DATABASE_URL` at a managed PostgreSQL, set a strong `AUTH_SECRET`
and `APP_ORIGIN`, configure SMTP for transactional mail, then:

```bash
npm run build && npm run db:deploy && npm start
```

## Map

| Area | URL | Code |
|---|---|---|
| Marketing site | `/`, `/*.html` | `public/` (static, untouched) |
| Auth | `/login`, `/register`, `/forgot-password`, `/reset-password` | `src/app/(auth)/` |
| Patient account | `/account`, `/account/book`, `/account/profile` | `src/app/account/` |
| Admin dashboard | `/admin/…` | `src/app/admin/` |
| API | `/api/…` | `src/app/api/` |
| Domain services | scheduling, reports, payroll, auth | `src/lib/` |
| Database schema | 20 models | `prisma/schema.prisma` |

See `docs/ARCHITECTURE.md` for the full design: scheduling rules,
security model, financial flows and scaling notes.

## Marketing-site content notes

- Hero video is optional and currently disabled; assets and re-enable
  steps live in `assets/videos/README.txt` (under `public/`).
- Placeholder stats in the homepage (commented out) await verified
  figures; the 4.9 rating is a sample value.
- Dr. Nada Salama's public profile carries verified basics only.
