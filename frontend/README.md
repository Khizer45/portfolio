# Portfolio website (Next.js)

The public portfolio and the `/admin` dashboard. All content comes from the FastAPI backend (`API_URL`). This app holds no content of its own, apart from static files in `public/` (CV, images, certificates).

## Quick start

```powershell
npm install
Copy-Item .env.example .env.local      # API_URL=http://localhost:8000
npm run dev                            # http://localhost:3000, admin at /admin
```

The backend must be running (see `../backend/README.md`).

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm run start` | Production build / serve it |
| `npm run lint` · `npm run typecheck` | ESLint · TypeScript |
| `npm run check` | Lint + type-check + build |
| `npm run test:e2e` | Playwright end-to-end tests (see `e2e/README.md`) |

## How it works

- **Public pages** (`src/app/(site)/`) are Server Components. They read data through `src/lib/content.ts`, are cached for 5 minutes, and are refreshed instantly after admin edits via `POST /api/revalidate`.
- **The admin** (`src/app/admin/`, `src/features/admin/`) runs in the browser and calls `/api/v1/*`. `next.config.ts` proxies those requests to the backend, so the session cookie stays on this site's domain.
- **Content types for the admin** are declared in `src/features/admin/resources.tsx` (form sections, list columns, toggles). Adding a field there, plus in the backend schema, is all a new field needs.
- **API types** live in `src/types/api.ts` and mirror `backend/app/schemas/`.

Deployment: [../docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md). Using the admin: [../docs/ADMIN_GUIDE.md](../docs/ADMIN_GUIDE.md).
