from fastapi import APIRouter, Request, Response, status

from app.api.deps import Admin, AppSettings, ClientIp, DbSession, verify_origin
from app.core.security import csrf_token_for
from app.schemas.auth import AdminUserRead, ChangePasswordRequest, LoginRequest, SessionResponse
from app.schemas.common import Message
from app.services import auth as auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_session_cookie(response: Response, settings, token: str) -> None:
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        max_age=settings.session_ttl_hours * 3600,
        path="/",
        httponly=True,  # not readable from JavaScript
        secure=settings.session_cookie_secure,
        samesite=settings.session_cookie_samesite,
    )


def _clear_session_cookie(response: Response, settings) -> None:
    response.delete_cookie(
        key=settings.session_cookie_name,
        path="/",
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite=settings.session_cookie_samesite,
    )


@router.post(
    "/login",
    response_model=SessionResponse,
    responses={401: {"description": "Invalid credentials"}, 429: {"description": "Too many attempts"}},
)
def login(body: LoginRequest, request: Request, response: Response, db: DbSession, settings: AppSettings, ip: ClientIp):
    """Sign in. Sets an HttpOnly session cookie and returns the CSRF token for later requests."""
    verify_origin(request, settings)
    result = auth_service.login(
        db, settings, email=body.email, password=body.password, ip=ip, user_agent=request.headers.get("user-agent")
    )
    _set_session_cookie(response, settings, result.token)
    return SessionResponse(
        user=AdminUserRead.model_validate(result.user),
        csrf_token=csrf_token_for(result.token, settings.secret_key),
        expires_at=result.session.expires_at,
    )


@router.post("/logout", response_model=Message)
def logout(ctx: Admin, response: Response, db: DbSession, settings: AppSettings):
    auth_service.logout(db, ctx.session, ctx.ip)
    _clear_session_cookie(response, settings)
    return Message(detail="Signed out.")


@router.get("/me", response_model=SessionResponse, responses={401: {"description": "Not signed in"}})
def me(ctx: Admin, settings: AppSettings):
    """The signed-in administrator, plus the CSRF token for this session."""
    return SessionResponse(
        user=AdminUserRead.model_validate(ctx.user),
        csrf_token=csrf_token_for(ctx.token, settings.secret_key),
        expires_at=ctx.session.expires_at,
    )


@router.put(
    "/password",
    response_model=Message,
    status_code=status.HTTP_200_OK,
    responses={429: {"description": "Too many failed attempts"}},
)
def change_password(body: ChangePasswordRequest, ctx: Admin, db: DbSession, settings: AppSettings):
    """Change the password. Other sessions are signed out; this one stays active.

    Wrong current passwords count as failed sign-ins and share the login rate limit.
    """
    auth_service.change_password(
        db,
        settings,
        user=ctx.user,
        current_session=ctx.session,
        current_password=body.current_password,
        new_password=body.new_password,
        ip=ctx.ip,
    )
    return Message(detail="Password changed. Other sessions have been signed out.")
