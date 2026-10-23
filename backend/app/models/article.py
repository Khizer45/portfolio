import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, Text, Uuid
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, Timestamps, UUIDPrimaryKey
from app.models.enums import ArticleStatus, check_in
from app.models.project import Project


class Article(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "articles"
    __table_args__ = (
        CheckConstraint(check_in("status", ArticleStatus), name="status"),
        Index("ix_articles_status_published_at", "status", "published_at"),
    )

    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    summary: Mapped[str] = mapped_column(String(500), nullable=False)
    # Markdown. Rendered by the frontend without raw HTML (see SECURITY.md).
    content: Mapped[str] = mapped_column(Text, nullable=False, default="")
    tags: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list, server_default="{}")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    # Set to link to an article hosted elsewhere (Medium, dev.to, …) instead of `content`.
    external_url: Mapped[str | None] = mapped_column(String(2048))
    related_project_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("projects.id", ondelete="SET NULL"), index=True
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    related_project: Mapped[Project | None] = relationship(lazy="joined")
