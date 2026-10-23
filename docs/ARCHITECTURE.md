# Architecture

This document explains how the portfolio is put together and why. For day-to-day use, see [ADMIN_GUIDE.md](./ADMIN_GUIDE.md); for hosting, [DEPLOYMENT.md](./DEPLOYMENT.md).

## Overview

```
                    ┌────────────────────────── Browser ───────────────────────────┐
                    │  Public pages (HTML)            Admin dashboard (/admin, JS)  │
                    └───────────┬──────────────────────────────┬────────────────────┘
                                │ GET /projects …               │ fetch /api/v1/… (same origin,
                                │                               │ HttpOnly session cookie)
                    ┌───────────▼──────────────────────────────▼────────────────────┐
                    │                Next.js 16 frontend (Vercel)                   │
                    │  • Public pages: Server Components, cached (ISR, 5 minutes)   │
                    │  • /api/v1/*  → rewrite (reverse proxy) to the backend        │
                    │  • /api/revalidate → refresh cached pages after admin edits   │
                    └───────────┬──────────────────────────────┬────────────────────┘
                server-side GET │                              │ proxied request
                  (API_URL)     │                              │ (cookie + CSRF header)
                    ┌───────────▼──────────────────────────────▼────────────────────┐
                    │                 FastAPI backend (e.g. Render)                 │
                    │  /api/v1 public (published content only) · /api/v1/auth ·     │
                    │  /api/v1/admin (session + CSRF required) · /health · /docs    │
                    └───────────────────────────────┬───────────────────────────────┘
                                                    │ SQLAlchemy 2 (psycopg 3)
                    ┌───────────────────────────────▼───────────────────────────────┐
                    │                  PostgreSQL (Neon or local)                   │
                    └───────────────────────────────────────────────────────────────┘
```

The frontend and backend are separate applications, deployed separately and connected only by HTTP. The backend knows nothing about Next.js. Any client that can hold a cookie can use it, and the OpenAPI docs at `/docs` describe every endpoint.

## Repository layout

```
portfolio/
├── backend/                     FastAPI application
│   ├── app/
│   │   ├── main.py              App factory: middleware, CORS, error handlers, /health
│   │   ├── api/                 HTTP layer
│   │   │   ├── deps.py          DB session, client IP, admin guard (session + CSRF + Origin)
│   │   │   └── v1/              public.py, auth.py, admin/ (crud.py factory, resources.py,
│   │   │                        projects.py, misc.py), router.py
│   │   ├── core/                config.py (settings), security.py (Argon2id, tokens),
│   │   │                        errors.py (safe JSON errors), logging.py (JSON logs)
│   │   ├── db/                  base.py (naming conventions, mixins), session.py (engine/pool)
│   │   ├── models/              SQLAlchemy models (one module per area)
│   │   ├── schemas/             Pydantic request/response models and validators
│   │   ├── repositories/        Query helpers; public.py holds every public query
│   │   ├── services/            auth (login, sessions, rate limiting), projects, slugs, audit
│   │   ├── cli.py               create-admin, set-password, seed, …
│   │   ├── seed_data.py         Initial verified content (loaded once)
│   │   └── tests/               pytest suite (runs against a separate *_test database)
│   ├── alembic/                 Database migrations
│   ├── scripts/start.sh, requirements*.txt, .env.example
├── frontend/                    Next.js application
│   ├── src/app/(site)/          Public pages (home, projects, skills, …)
│   ├── src/app/admin/           Admin routes (login, dashboard, generic resource screens)
│   ├── src/app/api/revalidate/  Cache refresh endpoint
│   ├── src/features/admin/      Admin CMS: API client, auth, form engine, resource definitions
│   ├── src/components/          Shared UI (cards, badges, layout)
│   ├── src/lib/                 content.ts (public data), api/server.ts (fetch + caching)
│   ├── src/types/api.ts         TypeScript mirror of the API schemas
│   ├── e2e/                     Playwright end-to-end tests
│   └── next.config.ts           Proxy rewrite, security headers
└── docs/                        This documentation
```

## Request flows

### Public pages

1. A visitor requests `/projects/local-ai-lab`.
2. Next.js serves the cached HTML if it has a copy younger than 5 minutes (Incremental Static Regeneration).
3. Otherwise it renders the page on the server, calling `GET {API_URL}/api/v1/projects/local-ai-lab`. The API returns **only published** content; drafts return 404, so the page shows "not found".
4. If the backend is asleep or down, the visitor still gets the last good cached copy. A failed background refresh never replaces a good page with an empty one.

Public pages contain no JavaScript-driven data loading, apart from the project filters, which work on data already in the page. They are fast, indexable, and keep working while a free-tier backend sleeps.

### Admin dashboard

1. `/admin/*` pages are rendered in the browser. On load, the dashboard calls `GET /api/v1/auth/me`.
2. `/api/v1/*` is a **same-origin** URL. `next.config.ts` rewrites it to `{API_URL}/api/v1/*`, so Next.js (on Vercel, its edge network) acts as a reverse proxy.
3. The session cookie set by `POST /api/v1/auth/login` therefore belongs to the frontend's own domain. It is a first-party cookie (`HttpOnly`, `Secure`, `SameSite=Lax`, `__Host-` prefix in production). This sidesteps third-party-cookie blocking, which would otherwise break logins when the frontend (`*.vercel.app`) and backend (`*.onrender.com`) live on different sites.
4. Writes (`POST/PUT/PATCH/DELETE`) send the CSRF token in `X-CSRF-Token`. The backend checks the session, the CSRF token, and the `Origin` header on **every** admin request, never trusting the frontend's route protection.
5. After a successful change, the dashboard calls `POST /api/revalidate`. That route forwards the visitor's cookie to `/api/v1/auth/me` to confirm an administrator is signed in, then invalidates the cache, so the change appears on the public site on the next page view.

### Authentication

```
POST /api/v1/auth/login {email, password}
  → rate limit check (failed attempts per account and per IP, stored in login_attempts)
  → Argon2id verify (a dummy hash is checked for unknown emails: equal timing)
  → new random 256-bit token; SHA-256(token) stored in admin_sessions with expiry
  ← Set-Cookie: session=<token>; HttpOnly; Secure; SameSite=Lax
  ← {user, csrf_token = HMAC-SHA256(SECRET_KEY, token), expires_at}
```

The CSRF token is derived from the session token rather than stored. It changes with every session and can be recomputed by `/auth/me`, so a page reload doesn't lose it. The browser keeps it in memory only.

## Data model

All tables use UUID primary keys and `created_at` / `updated_at` timestamps (except append-only logs). Constraint names follow a fixed convention (`uq_projects_slug`, `ck_experiences_date_order`, …), which lets the API turn a violated constraint into a friendly field error.

| Table | Purpose | Notable rules |
| --- | --- | --- |
| `admin_users` | Administrator accounts | Unique lower-cased email; Argon2id hash only; no registration endpoint |
| `admin_sessions` | Server-side sessions | SHA-256 of the token; expiry; deleted on logout or password change |
| `login_attempts` | Rate limiting | Indexed by (email, time) and (ip, time); pruned after 24 h |
| `audit_logs` | Who changed what | Actor set to NULL if the admin is deleted |
| `profile_settings` | Name, headline, bio, links, CV | Exactly one row (`singleton = 'default'`) |
| `project_categories` | 13 categories, each with a public page | Unique slug; icon from a fixed list |
| `projects` | Projects / case studies | Unique slug; status CHECK; primary category `ON DELETE RESTRICT`; `features`, `decisions`, `results`, `images` as validated JSONB arrays |
| `project_category_links` | Extra categories per project | Composite PK; cascades |
| `technologies` | Shared technology tags | Unique slug (`C#` → `csharp`), so names are unique case-insensitively |
| `project_technologies` | Project ↔ technology | Composite PK + `position`, preserving order |
| `skill_categories` / `skills` | Skills page | Case-insensitive unique skill names; level CHECK; evidence project `ON DELETE SET NULL` |
| `experiences` | Jobs, internships, freelance, … | Type CHECK; date-order CHECK; "current" cannot have an end date |
| `certifications` | Certificates | Expiry ≥ issue date |
| `education` | Degrees and schools | At most one primary row (partial unique index) |
| `achievements` | Awards, scholarships, competitions, publications | Type CHECK |
| `articles` | Writing | Status draft/published; `published_at` set on first publish |

**Partial dates.** Portfolio dates are usually "2025-07" or "2019", not specific days, so they are stored as `YYYY` or `YYYY-MM` strings with a CHECK constraint. Inventing a day would be misleading, and these strings sort chronologically.

**JSONB value objects.** Features, decisions, measured results, and images always belong to exactly one project. They are edited together and shown in order, so they are stored as ordered JSONB arrays and validated by Pydantic before they reach the database. Technologies are shared and filterable, so they get proper tables.

## Caching and freshness

| Layer | Behaviour |
| --- | --- |
| Public pages | ISR, `revalidate = 300` s, plus on-demand invalidation from the admin (`revalidateTag("content", { expire: 0 })` and `revalidatePath("/", "layout")`) |
| Public API fetches | Tagged `content`, 5-minute data cache, 90-second timeout (free backends can take about a minute to wake) |
| API responses | `Cache-Control: no-store` on every `/api/*` response, so neither a CDN nor a browser caches session-bearing data |
| Admin pages | `Cache-Control: no-store`, `X-Robots-Tag: noindex` |

**Build without a backend.** If the API is unreachable during `next build`, pages are built with empty content and a warning instead of failing the build. They fill in at the next revalidation, or immediately after any save in the admin. At runtime, errors are never cached. The previous good page keeps being served.

## Key decisions

| Decision | Why |
| --- | --- |
| Same-origin proxy (Next.js rewrite) instead of cross-site API calls | First-party cookies work in every browser; no `SameSite=None` cookies; CORS is only a second line of defence |
| Server-side sessions instead of JWT | Instant revocation (logout, password change, `revoke-sessions`), nothing sensitive in the browser, simple to reason about |
| CSRF token = HMAC(secret, session token) | Bound to the session, nothing extra to store, survives page reloads via `/auth/me` |
| Rate limiting in PostgreSQL | Survives restarts and works with several instances; no Redis needed on a free tier |
| Synchronous SQLAlchemy | Simpler code and tracebacks; FastAPI runs sync endpoints in a thread pool, ample for a portfolio |
| Text + CHECK instead of PostgreSQL ENUM types | Adding a status is a one-line migration |
| URLs instead of file uploads | Free hosts have ephemeral disks; images and PDFs live in the frontend's `public/` folder (deployed with the site) or on an external host. Only URLs are stored. |
| Generic admin resource engine | Each content type is a declarative definition (`src/features/admin/resources.tsx` + a backend `CrudResource`), so adding a field doesn't mean writing a new screen |
| Cache Components off | Classic ISR handles empty collections and pages created after the build without special cases |
