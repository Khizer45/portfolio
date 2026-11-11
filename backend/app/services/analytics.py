"""Privacy-friendly page-view counting: no cookies, no IP addresses stored."""

import hashlib
import re
from datetime import UTC, date, datetime, timedelta
from urllib.parse import urlsplit

from fastapi import Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.models import PageView

# Crawlers, link previews, monitoring and automated browsers are not visitors.
_BOT = re.compile(
    r"bot|crawl|spider|slurp|preview|headless|lighthouse|pagespeed|monitor|curl|wget|python|httpx|axios|node-fetch|go-http",
    re.IGNORECASE,
)
_EXCLUDED_PATHS = ("/admin", "/api/")
# A visitor reloading or revisiting the same page within this window counts once.
REPEAT_WINDOW = timedelta(minutes=30)
# Upper bound on what one visitor can record in a day, so a script can't flood the table.
MAX_VIEWS_PER_VISITOR_PER_DAY = 300


def local_today(settings: Settings, now: datetime | None = None) -> date:
    now = now or datetime.now(UTC)
    return (now + timedelta(hours=settings.analytics_utc_offset_hours)).date()


def _client_address(request: Request) -> str:
    # Only used, hashed, to tell visitors apart; the leftmost forwarded address is the
    # browser's as the hosting proxies report it. Spoofing it only skews the counts.
    forwarded = request.headers.get("x-forwarded-for", "").split(",")[0].strip()
    return forwarded or (request.client.host if request.client else "")


def visitor_id(request: Request, settings: Settings) -> str:
    user_agent = request.headers.get("user-agent", "")
    raw = f"{settings.secret_key}|{local_today(settings)}|{_client_address(request)}|{user_agent}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


def device_type(user_agent: str) -> str:
    if re.search(r"ipad|tablet", user_agent, re.IGNORECASE):
        return "tablet"
    if re.search(r"mobi|iphone|android", user_agent, re.IGNORECASE):
        return "mobile"
    return "desktop"


def referrer_host(referrer: str | None, own_host: str) -> str | None:
    if not referrer:
        return None
    try:
        host = (urlsplit(referrer).hostname or "").lower()
    except ValueError:
        return None
    host = host.removeprefix("www.")
    if not host or host == own_host.lower().removeprefix("www.").split(":")[0]:
        return None
    return host[:255]


def record_view(db: Session, request: Request, settings: Settings, path: str, referrer: str | None) -> str | None:
    """Store one page view. Returns None when it was counted, otherwise why it wasn't."""
    user_agent = request.headers.get("user-agent", "")
    if not user_agent or _BOT.search(user_agent):
        return "automated client"
    if path.startswith(_EXCLUDED_PATHS):
        return "admin or API page"
    # The site owner browsing while signed in to the admin isn't a visitor.
    if request.cookies.get(settings.session_cookie_name):
        return "signed in to the admin"
    visitor = visitor_id(request, settings)
    now = datetime.now(UTC)
    recent = db.scalar(
        select(PageView.id)
        .where(PageView.visitor == visitor, PageView.path == path, PageView.created_at > now - REPEAT_WINDOW)
        .limit(1)
    )
    if recent is not None:
        return "already counted in the last 30 minutes"
    today_count = db.scalar(
        select(func.count())
        .select_from(PageView)
        .where(PageView.visitor == visitor, PageView.created_at > now - timedelta(days=1))
    )
    if (today_count or 0) >= MAX_VIEWS_PER_VISITOR_PER_DAY:
        return "daily limit for this visitor"
    own_host = request.headers.get("x-forwarded-host") or request.headers.get("host", "")
    origin_host = urlsplit(request.headers.get("origin", "")).hostname or ""
    host = referrer_host(referrer, origin_host or own_host)
    db.add(PageView(path=path, referrer_host=host, visitor=visitor, device=device_type(user_agent)))
    db.commit()
    return None
