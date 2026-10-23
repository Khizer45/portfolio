"""Application settings, loaded from environment variables (and `.env` in development)."""

import secrets
import warnings
from functools import lru_cache
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    environment: Literal["development", "test", "production"] = "development"
    app_name: str = "Portfolio API"

    # Database ---------------------------------------------------------------
    database_url: str = "postgresql+psycopg://portfolio:portfolio@localhost:5432/portfolio"
    db_pool_size: int = 5
    db_max_overflow: int = 5
    db_pool_recycle_seconds: int = 300

    # Security ---------------------------------------------------------------
    secret_key: str = Field(default="", repr=False)
    # Comma-separated list of browser origins allowed to call the API.
    cors_origins: str = "http://localhost:3000"
    session_cookie_name: str = ""
    session_cookie_secure: bool | None = None
    session_cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    session_ttl_hours: int = 12
    login_max_attempts: int = 5
    login_window_minutes: int = 15
    # Number of proxies in front of the API that append to X-Forwarded-For (0 = use the
    # TCP peer address). See get_client_ip in app/api/deps.py.
    trusted_proxy_count: int = Field(default=0, ge=0, le=5)

    # Operations -------------------------------------------------------------
    docs_enabled: bool = True
    log_level: str = "INFO"
    log_json: bool | None = None

    @model_validator(mode="after")
    def _apply_defaults_and_check(self) -> "Settings":
        production = self.environment == "production"

        if self.database_url.startswith(("postgres://", "postgresql://")):
            # Hosted providers hand out plain postgres:// URLs; use the psycopg 3 driver.
            self.database_url = "postgresql+psycopg://" + self.database_url.split("://", 1)[1]

        if self.session_cookie_secure is None:
            self.session_cookie_secure = production
        if not self.session_cookie_name:
            # The __Host- prefix makes browsers reject the cookie unless it is Secure,
            # host-only, and Path=/ — so it is only usable over HTTPS.
            self.session_cookie_name = "__Host-portfolio_session" if self.session_cookie_secure else "portfolio_session"
        if self.log_json is None:
            self.log_json = production

        if production:
            if len(self.secret_key) < 32:
                raise ValueError("SECRET_KEY must be set to at least 32 random characters in production.")
            if not self.session_cookie_secure:
                raise ValueError("SESSION_COOKIE_SECURE must be true in production.")
            if "*" in self.cors_origins:
                raise ValueError("CORS_ORIGINS must list explicit origins in production, not '*'.")
        elif not self.secret_key:
            self.secret_key = secrets.token_urlsafe(48)
            if self.environment == "development":
                warnings.warn(
                    "SECRET_KEY is not set; using a temporary key. Sessions end when the server restarts.",
                    stacklevel=2,
                )

        if self.session_cookie_samesite == "none" and not self.session_cookie_secure:
            raise ValueError("SESSION_COOKIE_SAMESITE=none requires SESSION_COOKIE_SECURE=true.")
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip().rstrip("/") for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
