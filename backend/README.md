# Portfolio API (FastAPI)

The backend for the portfolio: a versioned REST API (`/api/v1`) over PostgreSQL, with a secure admin API for managing content. It's a standalone service; any client can use it, and interactive docs are served at `/docs`.

## Quick start

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1                 # macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt
Copy-Item .env.example .env                # set DATABASE_URL and SECRET_KEY
alembic upgrade head
python -m app.cli seed
python -m app.cli create-admin --email you@example.com --name "Your Name"
uvicorn app.main:app --reload              # http://localhost:8000/docs
```

## Endpoints

| Area | Routes |
| --- | --- |
| Health | `GET /health` (checks the database) |
| Public (published content only) | `GET /api/v1/profile`, `/projects` (search, category, technology, status, featured, pagination), `/projects/{slug}`, `/project-categories`, `/technologies`, `/skills`, `/experiences`, `/certifications`, `/education`, `/achievements`, `/articles`, `/articles/{slug}` |
| Auth | `POST /api/v1/auth/login`, `POST /auth/logout`, `GET /auth/me`, `PUT /auth/password` |
| Admin (session + `X-CSRF-Token`) | `GET /api/v1/admin/stats`, `/audit-logs`, `GET/PUT /admin/profile`, CRUD + `PATCH` toggles + `POST …/reorder` for `projects`, `project-categories`, `skill-categories`, `skills`, `experiences`, `certifications`, `education`, `achievements`, `articles`; `technologies` (list, rename, delete) |

Errors always look like `{"detail": "…", "errors": [{"field": "slug", "message": "…"}]}`.

## Commands

| Command | Purpose |
| --- | --- |
| `pytest` | Run the test suite (uses `TEST_DATABASE_URL`, a database ending in `_test`) |
| `ruff check .` / `ruff format .` | Lint / format |
| `alembic upgrade head` / `alembic check` | Apply migrations / verify models match migrations |
| `python -m app.cli create-admin --email … --name …` | Create an administrator (password prompt) |
| `python -m app.cli set-password --email …` | Reset a password (signs out all sessions) |
| `python -m app.cli list-admins` · `deactivate-admin` · `revoke-sessions` | Manage accounts |
| `python -m app.cli seed` | Load the initial content into empty tables |

## Layout

`app/api` (routes and the admin guard) · `app/core` (settings, security, errors, logging) · `app/models` · `app/schemas` · `app/repositories` · `app/services` · `app/tests` · `alembic/`.

See [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md), [../docs/SECURITY.md](../docs/SECURITY.md), and [../docs/DATABASE_MIGRATIONS.md](../docs/DATABASE_MIGRATIONS.md).
