from sqlalchemy import Boolean, CheckConstraint, String, Text, text
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

    availability_open: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    availability_label: Mapped[str] = mapped_column(String(150), nullable=False, default="")

    focus_areas: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list, server_default="{}")
    spoken_languages: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list, server_default="{}")
    career_interests: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list, server_default="{}")
    interests: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list, server_default="{}")
    approach: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list, server_default="{}")
    seeking: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list, server_default="{}")
