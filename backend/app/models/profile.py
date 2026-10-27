from sqlalchemy import Boolean, CheckConstraint, LargeBinary, String, Text, text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, Timestamps, UUIDPrimaryKey


class ProfileSettings(UUIDPrimaryKey, Timestamps, Base):
    """Site-wide profile. Exactly one row, enforced by the unique `singleton` column."""

    __tablename__ = "profile_settings"
    __table_args__ = (CheckConstraint("singleton = 'default'", name="singleton"),)

    singleton: Mapped[str] = mapped_column(String(10), unique=True, nullable=False, default="default")

    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    role: Mapped[str] = mapped_column(String(150), nullable=False, default="")
    headline: Mapped[str] = mapped_column(String(200), nullable=False)
    intro: Mapped[str] = mapped_column(String(600), nullable=False, default="")
    biography: Mapped[str] = mapped_column(Text, nullable=False, default="")
    location: Mapped[str] = mapped_column(String(120), nullable=False, default="")

    contact_email: Mapped[str | None] = mapped_column(String(254))
    github_url: Mapped[str | None] = mapped_column(String(2048))
    linkedin_url: Mapped[str | None] = mapped_column(String(2048))
    cv_url: Mapped[str | None] = mapped_column(String(2048))
    profile_image_url: Mapped[str | None] = mapped_column(String(2048))
    # [{"label": "Kaggle", "url": "https://..."}]
    social_links: Mapped[list[dict]] = mapped_column(JSONB, nullable=False, default=list, server_default=text("'[]'"))
    # Extra links for the header menu and footer: [{"label": "Blog", "url": "https://..."}]
    nav_links: Mapped[list[dict]] = mapped_column(JSONB, nullable=False, default=list, server_default=text("'[]'"))
    # Optional line shown in the footer under the name (the role is shown when empty).
    footer_text: Mapped[str] = mapped_column(String(300), nullable=False, default="", server_default="")
    # Portrait uploaded in the admin. Kept in the database because free hosts have ephemeral
    # disks; deferred so the bytes are only loaded when the image itself is requested.
    photo: Mapped[bytes | None] = mapped_column(LargeBinary, deferred=True)
    photo_type: Mapped[str | None] = mapped_column(String(32))

    availability_open: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    availability_label: Mapped[str] = mapped_column(String(150), nullable=False, default="")
    # The home page "open to work" card: a heading, a short note, and optional details.
    availability_heading: Mapped[str] = mapped_column(String(120), nullable=False, default="", server_default="")
    availability_note: Mapped[str] = mapped_column(String(400), nullable=False, default="", server_default="")
    work_preference: Mapped[str] = mapped_column(String(120), nullable=False, default="", server_default="")
    timezone: Mapped[str] = mapped_column(String(60), nullable=False, default="", server_default="")
    # Home page "Currently building" list: [{"title": "...", "description": "...", "url": "/projects/..."}].
    # When empty, in-progress projects are shown instead.
    currently_building: Mapped[list[dict]] = mapped_column(
        JSONB, nullable=False, default=list, server_default=text("'[]'")
    )

    # Site appearance (Admin → Profile → Appearance). The colours are optional overrides.
    theme_preset: Mapped[str] = mapped_column(
        String(20), nullable=False, default="blueprint", server_default="blueprint"
    )
    theme_mode: Mapped[str] = mapped_column(String(10), nullable=False, default="light", server_default="light")
    theme_accent: Mapped[str | None] = mapped_column(String(7))
    theme_button: Mapped[str | None] = mapped_column(String(7))
    theme_pattern: Mapped[str] = mapped_column(String(10), nullable=False, default="grid", server_default="grid")
    theme_cards: Mapped[str] = mapped_column(String(10), nullable=False, default="offset", server_default="offset")
    theme_corners: Mapped[str] = mapped_column(String(10), nullable=False, default="rounded", server_default="rounded")

    focus_areas: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list, server_default="{}")
    spoken_languages: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list, server_default="{}")
    career_interests: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list, server_default="{}")
    interests: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list, server_default="{}")
    approach: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list, server_default="{}")
    seeking: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list, server_default="{}")
