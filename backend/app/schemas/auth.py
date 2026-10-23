import uuid
from datetime import datetime
from typing import Annotated

from pydantic import EmailStr, Field

from app.schemas.common import ReadSchema, Schema


class LoginRequest(Schema):
    email: EmailStr
    password: Annotated[str, Field(min_length=1, max_length=128)]


class AdminUserRead(ReadSchema):
    id: uuid.UUID
    email: str
    display_name: str
    last_login_at: datetime | None


class SessionResponse(ReadSchema):
    user: AdminUserRead
    # Send this value in the X-CSRF-Token header on every POST/PUT/PATCH/DELETE.
    csrf_token: str
    expires_at: datetime


class ChangePasswordRequest(Schema):
    current_password: Annotated[str, Field(min_length=1, max_length=128)]
    new_password: Annotated[str, Field(min_length=1, max_length=128)]
