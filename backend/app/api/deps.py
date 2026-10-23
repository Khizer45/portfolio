"""Request dependencies: database session, client IP, and the admin guard."""

import ipaddress
from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.errors import AuthenticationError, PermissionDeniedError
from app.core.security import csrf_token_for, tokens_match
from app.db.session import get_db
from app.models import AdminSession, AdminUser
from app.services import auth as auth_service

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}
CSRF_HEADER = "X-CSRF-Token"

DbSession = Annotated[Session, Depends(get_db)]
AppSettings = Annotated[Settings, Depends(get_settings)]
# Page number for list endpoints (larger values would overflow the SQL OFFSET).
PageNumber = Annotated[int, Query(ge=1, le=10_000)]


def get_client_ip(request: Request, settings: AppSettings) -> str:
    """The client's address, as seen by the outermost trusted proxy.

    Each proxy appends the address it received the request from to X-Forwarded-For, so
    with N trusted proxies the Nth entry from the right is the last one a trusted proxy
    wrote. Entries further left come from the client and can be anything.
    """
    peer = (request.client.host if request.client else "unknown")[:45]
    hops = settings.trusted_proxy_count
    if hops:
        entries = ",".join(request.headers.getlist("x-forwarded-for")).split(",")
        if len(entries) >= hops:
            try:
                return str(ipaddress.ip_address(entries[-hops].strip()))
            except ValueError:
                pass
    return peer


ClientIp = Annotated[str, Depends(get_client_ip)]


def verify_origin(request: Request, settings: Settings) -> None:
    """Reject state-changing requests sent from pages on other sites.

    Browsers send Origin on cross-site and same-site POSTs. Non-browser clients (curl,
    scripts) may omit it; they can't carry a victim's cookies, so that's allowed.
    """
    origin = request.headers.get("origin")
    if origin is None:
        return
    # Either scheme: behind a TLS-terminating proxy the API itself only sees http.
    own_origins = {f"{scheme}://{request.url.netloc}" for scheme in ("http", "https")}
    if origin.rstrip("/") not in {*settings.cors_origin_list, *own_origins}:
        raise PermissionDeniedError("Request origin is not allowed.")


@dataclass
class AdminContext:
    user: AdminUser
    session: AdminSession
    token: str
    ip: str


def require_admin(request: Request, db: DbSession, settings: AppSettings, ip: ClientIp) -> AdminContext:
    """Every admin route depends on this. Authorization is decided here, on the server."""
    token = request.cookies.get(settings.session_cookie_name)
    if not token:
        raise AuthenticationError("Not authenticated.")
    session = auth_service.resolve_session(db, token)
    if session is None:
        raise AuthenticationError("Your session has expired. Please sign in again.")

    if request.method not in SAFE_METHODS:
        verify_origin(request, settings)
        provided = request.headers.get(CSRF_HEADER, "")
        if not provided or not tokens_match(provided, csrf_token_for(token, settings.secret_key)):
            raise PermissionDeniedError("Missing or invalid CSRF token.")

    return AdminContext(user=session.user, session=session, token=token, ip=ip)


Admin = Annotated[AdminContext, Depends(require_admin)]
