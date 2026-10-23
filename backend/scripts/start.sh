#!/bin/sh
# Production start command (e.g. Render's "Start Command": sh scripts/start.sh):
# apply pending migrations, then serve the API.
# Set RUN_MIGRATIONS=false to skip migrations (e.g. when running several instances).
set -e
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  alembic upgrade head
fi
# --no-proxy-headers: uvicorn must not replace the client address with a value from
# X-Forwarded-For (clients can send that header themselves). The app reads it instead,
# trusting only as many proxies as TRUSTED_PROXY_COUNT says (see .env.example).
exec uvicorn app.main:app \
  --host 0.0.0.0 \
  --port "${PORT:-8000}" \
  --no-proxy-headers
