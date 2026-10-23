# Khizer Hayat — Engineering Portfolio

A full-stack personal portfolio with a secure admin dashboard. Projects, skills, experience, certifications, education, articles, and the profile live in PostgreSQL and are edited in the browser, so no code changes are needed as the portfolio grows.

| | |
| --- | --- |
| **Frontend** | Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Lucide icons |
| **Backend** | Python 3.12+ · FastAPI · Pydantic 2 · SQLAlchemy 2 · Alembic |
| **Database** | PostgreSQL 16 |
| **Auth** | Server-side sessions · Argon2id · HttpOnly cookies · CSRF tokens · rate limiting |
| **Tests** | pytest (backend, real PostgreSQL) · Playwright (end-to-end) · ESLint · TypeScript |
| **Free hosting (suggested)** | Vercel (frontend) · Render (backend) · Neon (database) |

```
portfolio/
├── backend/     FastAPI API, models, migrations, CLI, tests
├── frontend/    Next.js site + /admin dashboard, Playwright tests
└── docs/        ARCHITECTURE · DEPLOYMENT · SECURITY · ADMIN_GUIDE · DATABASE_MIGRATIONS
```

The frontend and backend are separate apps. Run, integrate, and deploy them however you like; [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) is a reference for the free-tier route.

## Features

- **Public site:** home, projects (search plus category, technology, and status filters, and a detail page per project), 13 category pages, skills with honest proficiency labels, experience timeline, certifications and awards, about and education, writing, and contact. Light and dark themes, responsive, accessible, SEO metadata, sitemap.
- **Admin dashboard** (`/admin`): sign-in; a dashboard with live counts and recent changes; create, edit, publish/unpublish, feature, reorder, and delete for projects, skills, experience, certifications, education, awards and publications, articles, and categories; technology clean-up; profile settings; an activity log; password change.
- **Security:** no public registration, server-side authorization on every admin request, CSRF protection, brute-force limits, strict input validation, safe Markdown, security headers. See [docs/SECURITY.md](docs/SECURITY.md).
- **Honest by design:** projects and features carry real statuses (Planned → Deployed), results only show when measured, and drafts never reach visitors.

---

## Run it locally (Windows)

Tested with Windows PowerShell. On macOS or Linux, use `source .venv/bin/activate` instead of `.venv\Scripts\Activate.ps1` and `cp` instead of `Copy-Item`.

### 1. Install the tools (once)

- [Python 3.12+](https://www.python.org/downloads/) (tick "Add python.exe to PATH")
- [Node.js 20.9+ LTS](https://nodejs.org)
- [Git](https://git-scm.com/downloads)
- A PostgreSQL database. Pick **one**:
  - **A. PostgreSQL for Windows** ([installer](https://www.postgresql.org/download/windows/)). Lightest on 8 GB RAM. In *SQL Shell (psql)*, run:
    ```sql
    CREATE ROLE portfolio LOGIN PASSWORD 'portfolio';
    CREATE DATABASE portfolio OWNER portfolio;
    CREATE DATABASE portfolio_test OWNER portfolio;
    ```
  - **B. A free Neon database:** nothing to install. Create a project and use its connection string as `DATABASE_URL`. (Tests still need a local `portfolio_test` database.)

### 2. Backend (terminal 1)

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1          # if blocked: Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
pip install -r requirements-dev.txt
Copy-Item .env.example .env         # then open .env and set SECRET_KEY (command is in the file)
alembic upgrade head                # create the tables
python -m app.cli seed              # load the initial portfolio content (only into empty tables)
python -m app.cli create-admin --email khizerhayat.official0@gmail.com --name "Khizer Hayat"
uvicorn app.main:app --reload       # http://localhost:8000  (API docs: /docs)
```

### 3. Frontend (terminal 2)

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local   # API_URL=http://localhost:8000 is already set
npm run dev                         # http://localhost:3000  (admin: /admin)
```

Stop either server with `Ctrl + C`.

### 4. Check everything

```powershell
# backend (in backend/, venv active)
pytest                              # automated tests against portfolio_test
ruff check .                        # lint
alembic check                       # models match migrations

# frontend (in frontend/)
npm run lint
npm run typecheck
npm run build                       # production build (needs the backend running)
npm run test:e2e                    # end-to-end tests (needs both servers running; see frontend/e2e/README.md)
```

---

## Environment variables

**Backend** (`backend/.env`, or the host's environment settings). Full list in [backend/.env.example](backend/.env.example).

| Variable | Required | Example |
| --- | --- | --- |
| `DATABASE_URL` | yes | `postgresql+psycopg://portfolio:portfolio@localhost:5432/portfolio` |
| `SECRET_KEY` | in production | 48+ random characters |
| `ENVIRONMENT` | in production | `production` (enables Secure cookies, HSTS, strict checks) |
| `CORS_ORIGINS` | yes | `http://localhost:3000` or `https://you.vercel.app` |
| `TRUSTED_PROXY_COUNT` | behind a proxy | `2` for Vercel → Render, `1` for Render alone ([details](docs/DEPLOYMENT.md#4-deploy-the-backend)) |

**Frontend** (`frontend/.env.local`, or Vercel project settings). See [frontend/.env.example](frontend/.env.example).

| Variable | Required | Example |
| --- | --- | --- |
| `API_URL` | yes | `http://localhost:8000` or `https://your-api.onrender.com` |
| `NEXT_PUBLIC_SITE_URL` | no | `https://you.vercel.app` |

## Documentation

| Document | Read it when |
| --- | --- |
| [docs/ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md) | Adding or editing projects, skills, jobs, certificates, images, CV |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Publishing for free (Neon + Render + Vercel), free-tier limits, backups |
| [docs/SECURITY.md](docs/SECURITY.md) | Understanding the protections; production checklist |
| [docs/DATABASE_MIGRATIONS.md](docs/DATABASE_MIGRATIONS.md) | Changing the database schema |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the pieces fit together, and why |
