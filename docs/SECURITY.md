# Security

This document lists the protections in place, how to configure production safely, and the known limitations.

## Threat model in one paragraph

The site has one kind of user who can change anything: you, the administrator. Visitors can only read published content. The main risks are someone taking over the admin account (password guessing, stolen session, cross-site request forgery), visitors seeing unpublished content, and injected scripts (XSS) through content or links. Everything below is aimed at those risks.

## Controls

### Accounts and passwords
- **No registration.** The first administrator is created with a command-line tool (`python -m app.cli create-admin`). There is no default account.
- **Strong hashing.** Passwords are hashed with **Argon2id** (`argon2-cffi`, RFC 9106 parameters) and rehashed automatically if the parameters are raised later.
- **Password policy.** 12–128 characters, not trivially repetitive.
- **Password changes** require the current password and sign out every other session. A wrong current password counts as a failed sign-in, so it hits the same limit.

### Sessions
- **Random tokens.** The server-side session is a 256-bit random token. Only its **SHA-256 hash** is stored in `admin_sessions`, so a database leak doesn't expose live sessions.
- **Cookie.** `HttpOnly` (unreadable by JavaScript), `Secure` (HTTPS only, in production), `SameSite=Lax`, `Path=/`. In production it is named `__Host-portfolio_session`; the `__Host-` prefix makes browsers refuse it unless it's Secure and host-only.
- **Lifetime.** Sessions last 12 hours (`SESSION_TTL_HOURS`) and end on logout.
- **Revocation.** `python -m app.cli revoke-sessions --email …` signs an account out everywhere. `deactivate-admin` disables an account.

### Cross-site request forgery (CSRF)
- **Token.** Every state-changing admin request (`POST/PUT/PATCH/DELETE`) must send `X-CSRF-Token`, equal to `HMAC-SHA256(SECRET_KEY, session token)`. Login and `/auth/me` return it, and the browser keeps it in memory only.
- **Origin check.** State-changing requests and login are rejected when the browser's `Origin` header isn't in `CORS_ORIGINS` (or the API's own origin).
- **SameSite.** `SameSite=Lax` already stops cookies on cross-site POSTs in modern browsers. The token and the Origin check are additional layers.

### Authorization
- **Every admin route** under `/api/v1/admin/*` depends on one guard (`app/api/deps.py: require_admin`), which verifies the session (and, for writes, the CSRF token and Origin) **on the server**. Hiding the admin pages in the frontend is only for convenience.
- **Tests:** `app/tests/test_security.py` calls every admin operation from the OpenAPI spec without a session (expects 401), then with a session but no CSRF token (expects 403).
- **Public endpoints return only published or visible records.** Links to unpublished projects are removed from skills and articles. Tests cover drafts, hidden items, and these relations.

### Brute-force protection
- **Failed-login limit.** Failed logins are recorded in PostgreSQL. More than `LOGIN_MAX_ATTEMPTS` (5) failures for one account, or 20 from one IP address, within `LOGIN_WINDOW_MINUTES` (15), returns **429** until the window passes. Attempts for one account are handled one at a time (a PostgreSQL advisory lock), so parallel guesses can't slip past the limit.
- **Same answer, same timing.** Unknown emails and wrong passwords get the same message and take the same time, because a dummy hash is still verified.
- **Real client IPs.** `X-Forwarded-For` is ignored unless `TRUSTED_PROXY_COUNT` says how many proxies are in front of the API (`2` for Vercel → Render, `1` for Render alone). The API then uses only the address added by the outermost of those proxies; entries further left, which clients can make up, are ignored. uvicorn runs with `--no-proxy-headers`, so it doesn't replace the address itself. The right value depends on the proxy chain, so check the IP recorded for your own sign-in after deploying ([DEPLOYMENT.md](./DEPLOYMENT.md#verify-the-deployment)).

### Input validation and output safety
- **Strict schemas.** Every request body is validated by Pydantic with `extra="forbid"`: unknown fields are rejected, strings and lists have maximum sizes, and NUL characters are refused.
- **Body size.** Requests over 2 MB (16 KB for sign-in) are rejected with **413** before they are parsed.
- **URLs** must be absolute `http(s)://` URLs. File fields (CV, images, certificates) may instead be site-relative paths like `/cv/file.pdf`; `..` (also percent-encoded), `//`, backslashes, malformed `%` escapes, and other schemes such as `javascript:` or `data:` are rejected. The frontend runs the same checks for quick feedback.
- **SQL injection.** All queries go through SQLAlchemy with bound parameters. Search wildcards are escaped.
- **Database constraints** enforce enums, date formats, date order, uniqueness, and foreign keys even if application code had a bug.
- **XSS.** React escapes all text. Article Markdown is rendered with `react-markdown` **without** raw HTML support, and its URL filter drops `javascript:` links. JSON-LD is serialised with `<` escaped.
- **Errors** return a generic JSON message. Stack traces, SQL, and constraint names are logged on the server only, tagged with a request ID.

### Transport and headers
- **Backend headers:** `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Content-Security-Policy: default-src 'none'` (JSON only), `Cache-Control: no-store` on all `/api/*` responses, and HSTS in production.
- **Frontend headers:** a Content Security Policy (`default-src 'self'`, no plugins, no framing, `form-action 'self'`), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`. Admin pages are `no-store` and `noindex`.
- **CORS** allows only the origins in `CORS_ORIGINS`, with credentials. Wildcards are refused in production.
- **HTTPS** is provided by Vercel and Render. Secure cookies make the admin unusable over plain HTTP in production, by design.

### Secrets
- **Environment variables only.** `.env` files are git-ignored, and `.env.example` contains placeholders only.
- **Startup checks.** The backend refuses to start in production without a `SECRET_KEY` of at least 32 characters.
- **API responses** never include password hashes, session tokens, or configuration (tested).

### Auditing
- **Activity log.** Every content change, sign-in, sign-out, and password change is written to `audit_logs`: who, what, when, from which IP. You can see it under **Admin → Activity log**.

## Production checklist

- [ ] `ENVIRONMENT=production`
- [ ] `SECRET_KEY` set to 48+ random characters (`python -c "import secrets; print(secrets.token_urlsafe(48))"`), stored only in the host's environment settings
- [ ] `CORS_ORIGINS` = your exact frontend URL(s), comma-separated, no trailing slash
- [ ] `TRUSTED_PROXY_COUNT` matches your proxy chain (`2` for Vercel → Render), and your own sign-in is recorded with your real IP address
- [ ] Administrator created with a unique passphrase; no test accounts left (`python -m app.cli list-admins`)
- [ ] Database backups scheduled ([DEPLOYMENT.md §7](./DEPLOYMENT.md#7-backups-and-moving-providers))
- [ ] Optional: set `DOCS_ENABLED=false` to hide `/docs`. Docs show the API's shape, not its data, and admin routes still require a session.

## Rotating secrets

- **`SECRET_KEY`:** change it on the host and redeploy. CSRF tokens change with it, so the admin reloads its token automatically on the next page load. To also end every session, run `revoke-sessions`.
- **Database password:** reset it in Neon, update `DATABASE_URL` on the backend, and redeploy.
- **Admin password:** **Admin → Account & password**, or `python -m app.cli set-password --email …`, which also signs out all sessions.

## Known limitations

| Limitation | Why / mitigation |
| --- | --- |
| The frontend CSP allows `'unsafe-inline'` scripts | Next.js injects inline bootstrap scripts. A nonce-based CSP would make every page dynamic and lose static caching. XSS is prevented at the source instead: React escaping, Markdown without HTML, and URL validation. |
| No two-factor authentication | Single-owner site with rate limiting and a strong passphrase. TOTP could be added later to `admin_users`. |
| Rate limiting keys on IP address and account | Distributed attacks from many IPs are limited only by the per-account cap. That cap also lets an attacker who knows your email lock you out for 15 minutes. You can still sign in from the CLI host by waiting, or unlock by deleting rows from `login_attempts`. |
| No file uploads | Free hosts have ephemeral disks. Files live in `frontend/public/` (versioned in git) or an external host, and only URLs are stored. If uploads are added later, validate type and size and use object storage. |
| Free-tier availability | Render sleeps after 15 minutes idle; Neon keeps 6 hours of history. See [DEPLOYMENT.md](./DEPLOYMENT.md#1-know-the-free-tier-limits). |
| Proxy cookie behaviour depends on the host | The same-origin `/api/v1` rewrite was verified with `next start`. After deploying to Vercel, use the checklist in DEPLOYMENT.md §5 to confirm the cookie is set on the vercel.app domain. |

## Reporting a problem

If you find a vulnerability in this code, open a private security advisory on the GitHub repository rather than a public issue.
