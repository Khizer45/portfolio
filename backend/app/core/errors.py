"""Application errors and the handlers that turn them into safe JSON responses.

Every error response has the same shape:

    {"detail": "Human-readable message", "errors": [{"field": "slug", "message": "..."}]}

`errors` is only present for validation problems; `field` is null when a problem
concerns the request as a whole. Internal details (stack traces, SQL, constraint
names) are logged, never returned.
"""

import logging
import re

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import DataError, IntegrityError
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("app.errors")


class FieldValueError(ValueError):
    """Raised by a schema's model validator to name the field a cross-field rule concerns."""

    def __init__(self, field: str, message: str):
        super().__init__(message)
        self.field = field


class AppError(Exception):
    status_code = status.HTTP_400_BAD_REQUEST

    def __init__(
        self, detail: str, *, errors: list[dict[str, str | None]] | None = None, status_code: int | None = None
    ):
        super().__init__(detail)
        self.detail = detail
        self.errors = errors
        if status_code is not None:
            self.status_code = status_code


class NotFoundError(AppError):
    status_code = status.HTTP_404_NOT_FOUND


class ConflictError(AppError):
    status_code = status.HTTP_409_CONFLICT


class FieldValidationError(AppError):
    status_code = status.HTTP_422_UNPROCESSABLE_CONTENT

    def __init__(self, field: str, message: str):
        super().__init__("Validation failed", errors=[{"field": field, "message": message}])


class AuthenticationError(AppError):
    status_code = status.HTTP_401_UNAUTHORIZED


class PermissionDeniedError(AppError):
    status_code = status.HTTP_403_FORBIDDEN


class RateLimitedError(AppError):
    status_code = status.HTTP_429_TOO_MANY_REQUESTS


# Named constraints (see app/db/base.py naming convention) → friendly messages.
_CONSTRAINT_MESSAGES: dict[str, tuple[str, str]] = {
    "uq_projects_slug": ("slug", "A project with this slug already exists."),
    "uq_articles_slug": ("slug", "An article with this slug already exists."),
    "uq_project_categories_slug": ("slug", "A category with this slug already exists."),
    "uq_skill_categories_slug": ("slug", "A skill category with this slug already exists."),
    "uq_technologies_slug": ("name", "A technology with this name already exists."),
    "uq_skills_name_lower": ("name", "A skill with this name already exists."),
    "uq_admin_users_email": ("email", "An administrator with this email already exists."),
    "uq_education_primary": ("is_primary", "Only one education entry can be primary."),
}


def _error_body(detail: str, errors: list[dict[str, str | None]] | None = None) -> dict:
    body: dict = {"detail": detail}
    if errors:
        body["errors"] = errors
    return body


def integrity_error_to_app_error(exc: IntegrityError) -> AppError:
    orig = getattr(exc, "orig", None)
    diag = getattr(orig, "diag", None)
    constraint = getattr(diag, "constraint_name", None) or ""
    sqlstate = getattr(orig, "sqlstate", "") or ""

    if constraint in _CONSTRAINT_MESSAGES:
        field, message = _CONSTRAINT_MESSAGES[constraint]
        return ConflictError("Conflict", errors=[{"field": field, "message": message}])
    if sqlstate == "23503":  # foreign_key_violation
        if "is still referenced" in str(orig):
            return ConflictError("This record is still in use by other records and cannot be deleted.")
        column = re.search(r"\((\w+)\)=", str(orig))
        field = column.group(1) if column else "reference"
        return FieldValidationError(field, "The referenced record does not exist.")
    if sqlstate == "23505":  # unique_violation
        return ConflictError("A record with these values already exists.")
    if sqlstate in ("23514", "23502"):  # check_violation, not_null_violation
        return AppError("The data violates a database rule.", status_code=status.HTTP_422_UNPROCESSABLE_CONTENT)
    return ConflictError("The request conflicts with existing data.")


def _field_from_error(err: dict) -> str | None:
    if err.get("type") == "json_invalid":
        return None  # its loc is a character position, not a field
    parts = [str(p) for p in err.get("loc", ()) if p not in ("body", "query", "path")]
    cause = (err.get("ctx") or {}).get("error")
    if isinstance(cause, FieldValueError):
        parts.append(cause.field)
    return ".".join(parts) or None


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(_error_body(exc.detail, exc.errors), status_code=exc.status_code)

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(_: Request, exc: RequestValidationError) -> JSONResponse:
        errors = [
            {"field": _field_from_error(err), "message": err.get("msg", "Invalid value").removeprefix("Value error, ")}
            for err in exc.errors()
        ]
        return JSONResponse(_error_body("Validation failed", errors), status_code=status.HTTP_422_UNPROCESSABLE_CONTENT)

    @app.exception_handler(IntegrityError)
    async def handle_integrity_error(_: Request, exc: IntegrityError) -> JSONResponse:
        logger.info("integrity error", extra={"error": str(getattr(exc, "orig", exc)).splitlines()[0]})
        app_error = integrity_error_to_app_error(exc)
        return JSONResponse(_error_body(app_error.detail, app_error.errors), status_code=app_error.status_code)

    @app.exception_handler(DataError)
    async def handle_data_error(_: Request, exc: DataError) -> JSONResponse:
        # Safety net for values PostgreSQL refuses (too long, out of range, NUL bytes):
        # schemas should catch these first, so log them as warnings.
        logger.warning("data error", extra={"error": str(getattr(exc, "orig", exc)).splitlines()[0]})
        return JSONResponse(
            _error_body("A value is invalid or too long to be stored."),
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        )

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_error(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        detail = exc.detail if isinstance(exc.detail, str) else "Request failed"
        return JSONResponse(_error_body(detail), status_code=exc.status_code, headers=getattr(exc, "headers", None))

    @app.exception_handler(Exception)
    async def handle_unexpected_error(_: Request, exc: Exception) -> JSONResponse:
        logger.exception("unhandled error", exc_info=exc)
        return JSONResponse(_error_body("Internal server error"), status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
