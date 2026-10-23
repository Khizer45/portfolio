# End-to-end tests (Playwright)

Browser tests for the public site and the admin CMS. They drive a real Chromium
against servers **you have already started**; nothing is started or built by the tests.

> **Never point these tests at production.** They sign in as an administrator, create,
> publish, and delete content, and edit the profile. Use a local database only.

## Prerequisites

1. PostgreSQL running, with the backend's database migrated and seeded
   (`python -m app.cli seed`) and a local admin account
   (`python -m app.cli create-admin --email … --name …`). See `backend/README.md`.
2. The FastAPI backend running on <http://localhost:8000>.
3. The frontend running on <http://localhost:3000> — a production build
   (`npm run build` then `npm run start`) is closest to the real site; `npm run dev` also works.
4. Dependencies installed in `frontend/` (`npm install`) and the Playwright browser:
   `npx playwright install chromium` (once per machine). `@playwright/test` is pinned to
   an exact version; if Chromium is already installed in a shared folder, point
   `PLAYWRIGHT_BROWSERS_PATH` at it instead of installing again.

## Environment variables

| Variable | Required | Default | Meaning |
| --- | --- | --- | --- |
| `E2E_ADMIN_EMAIL` | yes | — | Email of your **local** admin account |
| `E2E_ADMIN_PASSWORD` | yes | — | Its password |
| `E2E_BASE_URL` | no | `http://localhost:3000` | Where the frontend runs |

The admin credentials are deliberately not stored in the repository; the run stops with
a clear message if they are missing.

## Running

Linux / macOS (from `frontend/`):

```bash
export E2E_ADMIN_EMAIL=admin@example.com
export E2E_ADMIN_PASSWORD='your-local-password'
npm run test:e2e
```

Windows PowerShell (from `frontend\`):

```powershell
$env:E2E_ADMIN_EMAIL = "admin@example.com"
$env:E2E_ADMIN_PASSWORD = "your-local-password"
npm run test:e2e
```

Useful variations (append after `npm run test:e2e --`, or use `npx playwright test …`):

| Command | What it does |
| --- | --- |
| `npx playwright test e2e/public.spec.ts` | One file |
| `npx playwright test -g "theme toggle"` | Tests whose title matches |
| `npx playwright test --project=mobile` | Only the phone-sized tests (Pixel 5) |
| `npx playwright test --headed` | Watch the browser |
| `npx playwright test --grep-invert @failed-login` | Skip the wrong-password test (see below) |
| `npx playwright show-trace test-results/<test>/trace.zip` | Inspect a failed test step by step |

## What the suite does to your data

- `auth.setup.ts` signs in once and saves the session to `e2e/.auth/` (git-ignored).
- Tests create their own records named **`E2E Test …`** and delete them again when they
  finish, pass or fail. The profile test changes the availability text and restores it.
- `cleanup.teardown.ts` runs last: it deletes any leftover `E2E Test …` projects, skills,
  experience entries, certifications, articles, and unused technologies (e.g. after an
  interrupted run), then signs the session out. Don't give real content a name starting
  with `E2E Test`.
- The admin activity log keeps entries for these changes; that is expected.

## Login rate limiting

The backend blocks sign-in after 5 failed attempts per email (20 per IP) within 15
minutes. The suite makes exactly **one** failed login (the test tagged `@failed-login`).
Don't run that test in a loop; skip it with `--grep-invert @failed-login` while you
iterate on other tests.

## Layout

| File | Covers |
| --- | --- |
| `public.spec.ts` | Home, navigation, project search/filters/URL params, project and category pages, drafts never public, writing, certifications empty state, theme, 404 |
| `mobile.spec.ts` | Public mobile menu and admin drawer (runs in the `mobile` project only) |
| `admin-auth.spec.ts` | Redirects, login validation, wrong password, login, logout, expired session |
| `admin-projects.spec.ts` | Project form validation, create → publish → edit → delete, unpublish |
| `admin-content.spec.ts` | Skills, experience, certifications, profile |
| `admin-errors.spec.ts` | Error and "Try again" states (API failures simulated with `page.route`) |
| `fixtures.ts` | Shared settings and helpers (`adminApi`, `eventually`, …) |

Public pages are cached and rebuilt after each admin change, so tests that check the
public site retry for up to ~20 seconds (`eventually(...)`) instead of checking once.

Tests marked with `test.fail()` document a known application bug (the comment names the
issue). They pass while the bug exists; once it is fixed Playwright reports them as
"expected to fail" — then remove the `test.fail()` line.
