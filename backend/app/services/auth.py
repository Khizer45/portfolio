"""Login, sessions, rate limiting, and password changes."""

import logging
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.errors import AuthenticationError, FieldValidationError, RateLimitedError
from app.core.security import (
    hash_password,
    hash_token,
    new_session_token,
    password_needs_rehash,
    validate_password_strength,
    verify_password,
)
from app.models import AdminSession, AdminUser, LoginAttempt
from app.services import audit

logger = logging.getLogger("app.auth")

INVALID_CREDENTIALS = "Invalid email or password."
_TOUCH_INTERVAL = timedelta(minutes=5)


@dataclass
class LoginResult:
    user: AdminUser
    session: AdminSession
    token: str


def _now() -> datetime:
    return datetime.now(UTC)


def normalize_email(email: str) -> str:
    return email.strip().lower()


def _recent_failures(db: Session, settings: Settings, *, email: str | None = None, ip: str | None = None) -> int:
    window_start = _now() - timedelta(minutes=settings.login_window_minutes)
    column = LoginAttempt.email if email is not None else LoginAttempt.ip_address
    value = email if email is not None else ip
    # Failures before the most recent success don't count.
    last_success = db.scalar(
        select(func.max(LoginAttempt.created_at)).where(column == value, LoginAttempt.succeeded.is_(True))
    )
    since = max(window_start, last_success) if last_success else window_start
    return (
        db.scalar(
            select(func.count()).where(
                column == value, LoginAttempt.succeeded.is_(False), LoginAttempt.created_at > since
            )
        )
        or 0
    )


def lock_account(db: Session, email: str) -> None:
    """Serialize password checks for one account until the transaction ends.

    Without this, parallel attempts would all pass check_rate_limit before any of them
    records its failure.
    """
    db.execute(select(func.pg_advisory_xact_lock(func.hashtext(email))))


def check_rate_limit(db: Session, settings: Settings, email: str, ip: str) -> None:
    limit = settings.login_max_attempts
    # Per account (stops guessing one password) and per IP (stops spraying many accounts;
    # higher because several people can share one IP).
    if _recent_failures(db, settings, email=email) >= limit or _recent_failures(db, settings, ip=ip) >= limit * 4:
        logger.warning("login rate limited", extra={"ip": ip})
        raise RateLimitedError(
            f"Too many failed sign-in attempts. Try again in {settings.login_window_minutes} minutes."
        )


def login(
    db: Session, settings: Settings, *, email: str, password: str, ip: str, user_agent: str | None
) -> LoginResult:
    email = normalize_email(email)
    lock_account(db, email)
    check_rate_limit(db, settings, email, ip)

    # Housekeeping: keep the attempt log and session table small.
    db.execute(delete(LoginAttempt).where(LoginAttempt.created_at < _now() - timedelta(days=1)))
    db.execute(delete(AdminSession).where(AdminSession.expires_at < _now()))

    user = db.scalar(select(AdminUser).where(AdminUser.email == email))
    # verify_password always runs (against a dummy hash if needed) so timing doesn't
    # reveal whether the account exists.
    valid = verify_password(user.password_hash if user else None, password)
    if not valid or user is None or not user.is_active:
        db.add(LoginAttempt(email=email, ip_address=ip, succeeded=False))
        db.commit()
        logger.info("login failed", extra={"ip": ip})
        raise AuthenticationError(INVALID_CREDENTIALS)

    if password_needs_rehash(user.password_hash):
        user.password_hash = hash_password(password)

    token = new_session_token()
    session = AdminSession(
        user_id=user.id,
        token_hash=hash_token(token),
        expires_at=_now() + timedelta(hours=settings.session_ttl_hours),
        ip_address=ip,
        user_agent=(user_agent or "")[:255] or None,
    )
    user.last_login_at = _now()
    db.add_all([session, LoginAttempt(email=email, ip_address=ip, succeeded=True)])
    audit.record(db, actor=user, action="login", entity_type="session", label=user.email, ip=ip)
    db.commit()
    logger.info("login succeeded", extra={"user_id": str(user.id)})
    return LoginResult(user=user, session=session, token=token)


def resolve_session(db: Session, token: str) -> AdminSession | None:
    """The active session for a cookie token, or None if it is unknown, expired, or the user is disabled."""
    session = db.scalar(select(AdminSession).where(AdminSession.token_hash == hash_token(token)))
    now = _now()
    if session is None or session.expires_at <= now or not session.user.is_active:
        return None
    if now - session.last_used_at > _TOUCH_INTERVAL:
        session.last_used_at = now
        db.commit()
    return session


def logout(db: Session, session: AdminSession, ip: str | None) -> None:
    audit.record(db, actor=session.user, action="logout", entity_type="session", label=session.user.email, ip=ip)
    db.delete(session)
    db.commit()


def change_password(
    db: Session,
    settings: Settings,
    *,
    user: AdminUser,
    current_session: AdminSession,
    current_password: str,
    new_password: str,
    ip: str,
) -> None:
    # Wrong current passwords count as failed logins, so a stolen session can't be used
    # to guess the password without limit.
    lock_account(db, user.email)
    check_rate_limit(db, settings, user.email, ip)
    if not verify_password(user.password_hash, current_password):
        db.add(LoginAttempt(email=user.email, ip_address=ip, succeeded=False))
        db.commit()
        raise FieldValidationError("current_password", "Current password is incorrect.")
    problem = validate_password_strength(new_password)
    if problem:
        raise FieldValidationError("new_password", problem)
    if verify_password(user.password_hash, new_password):
        raise FieldValidationError("new_password", "Choose a password different from the current one.")
    user.password_hash = hash_password(new_password)
    # Sign out every other device.
    db.execute(delete(AdminSession).where(AdminSession.user_id == user.id, AdminSession.id != current_session.id))
    audit.record(
        db, actor=user, action="password_change", entity_type="admin_user", entity_id=user.id, label=user.email, ip=ip
    )
    db.commit()


def create_admin(db: Session, *, email: str, password: str, display_name: str) -> AdminUser:
    email = normalize_email(email)
    problem = validate_password_strength(password)
    if problem:
        raise ValueError(problem)
    if db.scalar(select(AdminUser).where(AdminUser.email == email)):
        raise ValueError(f"An administrator with email {email} already exists.")
    user = AdminUser(email=email, password_hash=hash_password(password), display_name=display_name.strip() or "Admin")
    db.add(user)
    audit.record(db, actor=None, action="create", entity_type="admin_user", label=email)
    db.commit()
    return user
