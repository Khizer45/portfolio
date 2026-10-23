# Database migrations

The database schema is defined by the SQLAlchemy models in `backend/app/models/` and created by **Alembic** migrations in `backend/alembic/versions/`. Never create or change tables by hand, and never let the app recreate tables automatically: migrations are the only source of truth.

All commands run in the `backend` folder with the virtual environment active:

```powershell
cd backend
.venv\Scripts\Activate.ps1      # macOS/Linux: source .venv/bin/activate
```

The database comes from `DATABASE_URL` (in `backend/.env` locally, or an environment variable).

## Everyday commands

| Task | Command |
| --- | --- |
| Bring a database up to date | `alembic upgrade head` |
| See the current revision | `alembic current` |
| See history | `alembic history --verbose` |
| Check that the models match the migrations | `alembic check` |
| Undo the last migration | `alembic downgrade -1` |
| Show the SQL without running it | `alembic upgrade head --sql` |

## Changing the schema (step by step)

Example: add a `location` field to certifications.

1. **Change the model** in `backend/app/models/career.py`:
   ```python
   location: Mapped[str | None] = mapped_column(String(120))
   ```
2. **Generate a migration:**
   ```powershell
   alembic revision --autogenerate -m "add certification location"
   ```
3. **Read the generated file** in `alembic/versions/`. Autogenerate is a starting point, not a guarantee:
   - **Renames** show up as "drop column + add column", which would lose data. Replace them with `op.alter_column(..., new_column_name=...)`.
   - **New NOT NULL columns** on tables that already have rows need a `server_default`, or a three-step migration: add nullable → fill → set NOT NULL.
   - Check that `downgrade()` reverses `upgrade()`.
4. **Apply it locally:** `alembic upgrade head`, then `alembic check` (expect "No new upgrade operations detected").
5. **Update the API:** the Pydantic schema in `app/schemas/`, the frontend type in `frontend/src/types/api.ts`, and the admin form field in `frontend/src/features/admin/resources.tsx`.
6. **Run the tests:** `pytest`. The suite builds its database from the migrations, and `test_migrations.py` fails if the models and migrations disagree.
7. **Commit** the model and the migration together.

## Production

- **Automatic on deploy.** If the host starts the backend with `scripts/start.sh` (as in [DEPLOYMENT.md](./DEPLOYMENT.md)), it runs `alembic upgrade head` on every start, so pushing a commit with a new migration upgrades the production database on deploy. Set `RUN_MIGRATIONS=false` to skip this (e.g. with several instances; then run migrations once by hand).
- **Back up first** before deploying a migration that changes or removes existing data (see [DEPLOYMENT.md §7](./DEPLOYMENT.md#7-backups-and-moving-providers)).
- **Run it from your computer:** set `$env:DATABASE_URL` to the production connection string and run `alembic upgrade head`.
- **If a migration fails** on deploy, the transaction is rolled back (PostgreSQL supports transactional DDL), and the old version of the app keeps running. Fix the migration and redeploy.

## Seeding

`python -m app.cli seed` loads the initial content from `app/seed_data.py`. It only fills **empty** tables, so it's safe to run twice and never overwrites your edits. After the first seed, manage content in the admin dashboard.

## Starting over (local only)

```powershell
alembic downgrade base   # drops every table
alembic upgrade head
python -m app.cli seed
python -m app.cli create-admin --email you@example.com --name "Your Name"
```

## Tests and databases

The test suite uses a **separate** database (`TEST_DATABASE_URL`, default `portfolio_test`) and refuses to run if its name doesn't end in `_test`. At the start of a run it migrates that database down and up again, and every test runs in a transaction that is rolled back. Never point `TEST_DATABASE_URL` at real data.
