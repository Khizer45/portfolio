# Deployment

This is a reference for when you deploy the site yourself; nothing here has been deployed for you. The suggested free setup uses three services, each on its free plan. None needs a credit card, and none can charge you automatically:

| Part | Service | Free URL |
| --- | --- | --- |
| Frontend (Next.js) | [Vercel](https://vercel.com) Hobby | `https://<project>.vercel.app` |
| Backend (FastAPI) | [Render](https://render.com) free web service (or any host that runs Python 3.12+) | `https://<service>.onrender.com` |
| Database (PostgreSQL) | [Neon](https://neon.com) Free | connection string |

Deploy in this order: **database → backend → frontend**.

---

## 1. Know the free-tier limits

Checked against the providers' documentation in **October 2026**. Free tiers change, so re-check before relying on them.

**Render free web service** ([docs](https://render.com/docs/free))
- **Spin-down:** the service goes to sleep after **15 minutes** with no traffic, and the next request waits **about a minute** while it starts again.
- **Hours:** **750 free instance hours** per workspace per month. That covers one service running all month; when they run out, the service is suspended until the next month.
- **Disk:** the filesystem is ephemeral. Never store uploads on it (this app doesn't).
- **Don't use Render's free PostgreSQL** for this site: it [expires 30 days after creation](https://render.com/changelog/free-postgresql-instances-now-expire-after-30-days-previously-90) (then a 14-day grace period before deletion) and has no backups.

**Neon Free** ([plans](https://neon.com/docs/introduction/plans))
- **Storage:** 1 GB per project. This portfolio uses a few MB.
- **Compute:** 100 compute-unit hours per project per month.
- **Scale to zero:** the database suspends after **5 minutes** idle, and the first query after that takes a moment longer.
- **Restore window:** only **6 hours** of point-in-time restore. **Make your own backups** (section 7).

**Vercel Hobby** ([plan](https://vercel.com/docs/plans/hobby), [fair use](https://vercel.com/docs/limits/fair-use-guidelines))
- **Personal use only:** the plan is for personal, **non-commercial** projects. A personal portfolio fits.
- **Allowance:** 100 GB of Fast Data Transfer and 1,000,000 function invocations per month.
- **Over the limit:** features are paused until the next cycle; you are not billed.

**What this means for visitors**
- **Public pages stay fast while the backend sleeps.** They're served from Vercel's cache and refreshed in the background.
- **The first admin sign-in after a quiet period can take up to a minute** while Render wakes the backend. The login form simply waits.
- **Nothing on free tiers guarantees uptime.** If you need always-on hosting later, the same code runs on any paid plan or VPS without changes.

---

## 2. Push the code to GitHub

```powershell
cd portfolio
git remote add origin https://github.com/Khizer45/portfolio.git
git branch -M main
git push -u origin main
```

Never commit `.env` files; `.gitignore` already excludes them.

---

## 3. Create the database (Neon)

1. Sign up at <https://neon.com> and create a project (pick the region closest to your Render region).
2. **Connection Details** → choose the **direct** connection (not "pooled") and copy the string. It looks like:
   `postgresql://neondb_owner:XXXX@ep-cool-name-123456.eu-central-1.aws.neon.tech/neondb?sslmode=require`
3. Keep it secret. It becomes `DATABASE_URL` on the backend.

> Why direct? The backend keeps its own small connection pool (5 + 5 overflow), well within Neon's limits. psycopg 3 uses server-side prepared statements, which are more predictable without a pooler in between.

---

## 4. Deploy the backend

### Render (free web service)

1. Render dashboard → **New → Web Service** → connect your GitHub repository.
2. **Root directory:** `backend` · **Runtime:** Python 3 · **Instance type:** Free.
3. **Build command:** `pip install -r requirements.txt` · **Start command:** `sh scripts/start.sh`.
4. **Health check path:** `/health`.
5. **Environment variables:**

   | Name | Value |
   | --- | --- |
   | `ENVIRONMENT` | `production` |
   | `DATABASE_URL` | the Neon connection string |
   | `SECRET_KEY` | output of `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
   | `CORS_ORIGINS` | `https://<your-project>.vercel.app` (add custom domains later, comma-separated) |
   | `TRUSTED_PROXY_COUNT` | `2` (browser → Vercel → Render; see below) |
   | `PYTHON_VERSION` | `3.13.0` (only if Render picks an older Python) |

   `TRUSTED_PROXY_COUNT` is the number of proxies that add the visitor's address to `X-Forwarded-For`. The API uses the address added by the outermost of them, so the sign-in limit and the activity log see real IP addresses; anything further left in the header could have been typed by the visitor and is ignored. Use `2` for the setup in this guide (Vercel forwards `/api/v1` to Render), or `1` if browsers call the Render URL directly ([section 8](#8-alternative-topology-browser-calls-the-backend-directly)). The right value depends on how each proxy in the chain handles the header, and this hasn't been tested on Render or Vercel, so check it after deploying ([Verify the deployment](#verify-the-deployment)). Too high, and visitors can choose the address they are recorded under; too low, and everyone shares a proxy's address. With `2`, requests sent straight to the onrender.com URL can still choose their recorded address (the per-account sign-in limit still applies).

6. **Create Web Service.** On every start, `scripts/start.sh` runs `alembic upgrade head` (migrations) and then starts the API with uvicorn.
7. Check `https://<service>.onrender.com/health` → `{"status":"ok","database":"ok"}`.

### Any other host (VPS, home server, another platform)

Install the dependencies (`pip install -r requirements.txt`), set the same environment variables, and run `sh scripts/start.sh` (or the `alembic` and `uvicorn` commands inside it). Put it behind HTTPS (the platform's TLS, or Caddy / Nginx with Let's Encrypt). `ENVIRONMENT=production` sets `Secure` cookies, which browsers only send over HTTPS.

### Load content and create your administrator

Run these **once**, from your own computer, against the production database. This works on every host, including free instances without shell access:

```powershell
cd backend
.venv\Scripts\Activate.ps1
$env:DATABASE_URL = "postgresql://…neon connection string…"
$env:ENVIRONMENT = "development"   # only for this terminal; skips production-only checks for the CLI
alembic upgrade head
python -m app.cli seed
python -m app.cli create-admin --email khizerhayat.official0@gmail.com --name "Khizer Hayat"
Remove-Item Env:DATABASE_URL
```

You'll be asked for a password (12+ characters; a long passphrase is best). There is no default account, and no one can register through the website.

---

## 5. Deploy the frontend (Vercel)

1. <https://vercel.com/new> → import the GitHub repository.
2. **Root Directory:** `frontend` (Vercel detects Next.js automatically).
3. **Environment variables:**

   | Name | Value |
   | --- | --- |
   | `API_URL` | `https://<service>.onrender.com` (no trailing slash) |
   | `NEXT_PUBLIC_SITE_URL` | optional, e.g. `https://khizer-hayat.vercel.app` |

4. **Deploy.** Make sure the backend is running first: the build reads your content from the API. If the backend is unreachable, the build still succeeds, but pages start empty and fill in at the next refresh.
5. Back on Render, make sure `CORS_ORIGINS` contains the exact Vercel URL (`https://…vercel.app`, no trailing slash).

### Verify the deployment

- [ ] `https://<project>.vercel.app` shows your name and projects.
- [ ] `https://<project>.vercel.app/api/v1/projects` returns JSON (the proxy works).
- [ ] `https://<project>.vercel.app/admin` redirects to the sign-in page.
- [ ] Sign in works, and the browser's developer tools (Application → Cookies) show `__Host-portfolio_session` on the **vercel.app** domain, marked HttpOnly and Secure.
- [ ] Editing your headline in **Admin → Profile** changes the home page within a few seconds (reload once).
- [ ] `https://<service>.onrender.com/api/v1/admin/stats` returns `401` in a private window.
- [ ] The IP address recorded for your sign-in is your own public address (compare with any "what is my IP" site). Look in **Admin → Activity log**, or run `SELECT created_at, ip_address FROM audit_logs WHERE action = 'login' ORDER BY created_at DESC LIMIT 3;` in Neon's SQL Editor. If it shows a different address, adjust `TRUSTED_PROXY_COUNT` on Render and sign in again.

If sign-in "works" but you're immediately signed out again, the cookie isn't being kept: check that `API_URL` points at the backend and that you opened the site through the Vercel URL, not the Render URL.

---

## 6. Redeploying after changes

| You changed | What happens |
| --- | --- |
| Content (projects, skills, …) in the admin | Nothing to deploy; it's in the database |
| Code, then `git push` | Vercel and Render both rebuild and redeploy automatically |
| A database model | Commit the new Alembic migration; it runs automatically when the backend restarts (see [DATABASE_MIGRATIONS.md](./DATABASE_MIGRATIONS.md)) |
| Images or the CV in `frontend/public/` | `git push`; Vercel redeploys with the new files |

---

## 7. Backups and moving providers

Free databases are not guaranteed to last forever. Keep your own copy.

**Back up** (install the [PostgreSQL client tools](https://www.postgresql.org/download/); on Windows, the installer's "Command Line Tools" option is enough):

```powershell
pg_dump --format=custom --no-owner --dbname "postgresql://…neon…" --file "portfolio-$(Get-Date -Format yyyy-MM-dd).dump"
```

Do it at least monthly and after big edits. Store the file somewhere private (it contains your admin password hash and session data).

**Restore / move to another PostgreSQL** (Supabase, another Neon project, a VPS, local):

```powershell
pg_restore --no-owner --clean --if-exists --dbname "postgresql://…new database…" portfolio-2026-10-21.dump
```

Then point the backend's `DATABASE_URL` at the new database and redeploy. The application needs no other changes: it uses standard PostgreSQL, and the schema is defined by Alembic migrations.

**Move the backend** to another host: deploy the `backend` folder with the same environment variables, then update `API_URL` on Vercel.

**Move the frontend** off Vercel: on any Node.js 20.9+ host, run `npm ci`, `npm run build`, and `npm start` in `frontend`, behind HTTPS. Set `API_URL` **before** `npm run build`, as well as at runtime: the `/api/v1` proxy target is fixed at build time, while page data is fetched at runtime.

---

## 8. Alternative topology: browser calls the backend directly

Not recommended, but supported: set `NEXT_PUBLIC_API_URL=https://<service>.onrender.com` on the frontend, and on the backend set `SESSION_COOKIE_SAMESITE=none` and list the frontend origin in `CORS_ORIGINS`. The session cookie then becomes a third-party cookie, which some browsers (e.g. Safari) block. On-demand revalidation from the admin also stops working, so pages refresh on their 5-minute schedule only.

---

## 9. Local development

See the root [README](../README.md#run-it-locally-windows) for Windows PowerShell commands. In short: PostgreSQL (installed locally, or a free Neon branch) → `backend` (`alembic upgrade head`, `python -m app.cli seed`, `uvicorn app.main:app --reload`) → `frontend` (`npm run dev`).
