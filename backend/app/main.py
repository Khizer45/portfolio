"""FastAPI application factory.

Run locally:  uvicorn app.main:app --reload
"""

import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from starlette.exceptions import HTTPException
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.api.v1.router import api_router
from app.core.config import Settings, get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging, request_id_var
from app.db.session import get_engine

logger = logging.getLogger("app")
access_logger = logging.getLogger("app.access")

_DOCS_PATHS = ("/docs", "/redoc", "/openapi.json")
# Largest legitimate bodies: an article (200,000 characters) or a full project case study.
MAX_BODY_BYTES = 2 * 1024 * 1024
MAX_LOGIN_BODY_BYTES = 16 * 1024
_TOO_LARGE = "Request body is too large."


class RequestGuard:
    """Rejects oversized bodies (413) and NUL characters in the URL (422) before any parsing.

    FastAPI parses JSON bodies before dependencies such as require_admin run, so without a
    cap one anonymous request could make the server use hundreds of MB of memory.
    """

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        if "\x00" in scope["path"] or b"%00" in scope["query_string"]:
            # PostgreSQL can't store or compare NUL characters.
            response = JSONResponse({"detail": "The URL must not contain NUL characters."}, status_code=422)
            return await response(scope, receive, send)

        is_login = scope["method"] == "POST" and scope["path"] == "/api/v1/auth/login"
        limit = MAX_LOGIN_BODY_BYTES if is_login else MAX_BODY_BYTES
        declared = dict(scope["headers"]).get(b"content-length", b"")
        if declared.isdigit() and int(declared) > limit:
            return await JSONResponse({"detail": _TOO_LARGE}, status_code=413)(scope, receive, send)

        received = 0

        async def limited_receive() -> Message:
            # Bodies without Content-Length (chunked) are counted as they arrive. FastAPI
            # re-raises HTTPExceptions from here, and the app's handler returns the 413.
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > limit:
                    raise HTTPException(status_code=413, detail=_TOO_LARGE)
            return message

        await self.app(scope, limited_receive, send)


def _security_headers(response: Response, path: str, settings: Settings) -> None:
    headers = response.headers
    headers.setdefault("X-Content-Type-Options", "nosniff")
    headers.setdefault("X-Frame-Options", "DENY")
    headers.setdefault("Referrer-Policy", "no-referrer")
    headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
    if not path.startswith(_DOCS_PATHS):
        # JSON only: nothing here should ever load scripts, frames, or other resources.
        headers.setdefault("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
    if settings.is_production:
        headers.setdefault("Strict-Transport-Security", "max-age=63072000; includeSubDomains")
    if path.startswith("/api/"):
        # Responses can carry session data; never let a CDN or browser cache them.
        # (Vercel caches proxied responses according to upstream Cache-Control.)
        headers["Cache-Control"] = "no-store"
        headers.setdefault("Vary", "Cookie")


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings.log_level, bool(settings.log_json))

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        logger.info("starting", extra={"environment": settings.environment})
        yield
        get_engine().dispose()

    app = FastAPI(
        title=settings.app_name,
        version="1.0.0",
        description=(
            "API for Khizer Hayat's portfolio. Public endpoints return only published content. "
            "Admin endpoints require a session cookie from `POST /api/v1/auth/login` and, for "
            "state-changing requests, the `X-CSRF-Token` header returned by login or `/auth/me`."
        ),
        docs_url="/docs" if settings.docs_enabled else None,
        redoc_url="/redoc" if settings.docs_enabled else None,
        openapi_url="/openapi.json" if settings.docs_enabled else None,
        lifespan=lifespan,
    )

    register_exception_handlers(app)
    # Added first, so it runs inside request_context (which adds headers and logging).
    app.add_middleware(RequestGuard)

    @app.middleware("http")
    async def request_context(request: Request, call_next):
        request_id = request.headers.get("x-request-id", "")[:64] or uuid.uuid4().hex[:16]
        token = request_id_var.set(request_id)
        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            logger.exception("unhandled error")
            response = JSONResponse({"detail": "Internal server error"}, status_code=500)
        duration_ms = round((time.perf_counter() - start) * 1000, 1)
        response.headers["X-Request-ID"] = request_id
        _security_headers(response, request.url.path, settings)
        if request.url.path != "/health":
            access_logger.info(
                "request",
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "status": response.status_code,
                    "duration_ms": duration_ms,
                },
            )
        request_id_var.reset(token)
        return response

    # CORS is only needed if the browser calls the API directly (not through the
    # frontend's same-origin proxy). Origins are an explicit allow-list.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Content-Type", "X-CSRF-Token", "X-Request-ID"],
        max_age=600,
    )

    app.include_router(api_router)

    @app.get("/health", tags=["health"])
    def health() -> JSONResponse:
        """Liveness and database connectivity. Used by hosting health checks."""
        try:
            with get_engine().connect() as connection:
                connection.execute(text("SELECT 1"))
            return JSONResponse({"status": "ok", "database": "ok"})
        except Exception:
            logger.exception("health check: database unavailable")
            return JSONResponse({"status": "degraded", "database": "unavailable"}, status_code=503)

    @app.get("/", include_in_schema=False)
    def root() -> dict:
        return {"name": settings.app_name, "docs": "/docs" if settings.docs_enabled else None, "health": "/health"}

    return app


app = create_app()
