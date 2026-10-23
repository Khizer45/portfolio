import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Table,
    Text,
    Uuid,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, Timestamps, UUIDPrimaryKey
from app.models.enums import PARTIAL_DATE_SQL, CategoryIcon, ProjectStatus, check_in


class ProjectCategory(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "project_categories"
    __table_args__ = (CheckConstraint(check_in("icon", CategoryIcon), name="icon"),)

    slug: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    short_title: Mapped[str] = mapped_column(String(60), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    focus_areas: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list, server_default="{}")
    icon: Mapped[str] = mapped_column(String(30), nullable=False, default="layers")
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class Technology(UUIDPrimaryKey, Base):
    """Shared technology tags. Created automatically when a project uses a new name."""

    __tablename__ = "technologies"

    name: Mapped[str] = mapped_column(String(60), nullable=False)
    # Lower-case, dash-separated form of the name; makes names unique case-insensitively.
    slug: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"), nullable=False)


class ProjectTechnology(Base):
    """Association object, so each project keeps its technologies in a chosen order."""

    __tablename__ = "project_technologies"

    project_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True)
    technology_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("technologies.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    technology: Mapped[Technology] = relationship(lazy="joined")


# Optional extra categories (the primary category is projects.category_id).
project_category_links = Table(
    "project_category_links",
    Base.metadata,
    Column("project_id", Uuid, ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True),
    Column("category_id", Uuid, ForeignKey("project_categories.id", ondelete="CASCADE"), primary_key=True, index=True),
)


class Project(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "projects"
    __table_args__ = (
        CheckConstraint(check_in("status", ProjectStatus), name="status"),
        CheckConstraint(f"start_date IS NULL OR start_date ~ {PARTIAL_DATE_SQL}", name="start_date_format"),
        CheckConstraint(f"end_date IS NULL OR end_date ~ {PARTIAL_DATE_SQL}", name="end_date_format"),
        CheckConstraint("start_date IS NULL OR end_date IS NULL OR end_date >= start_date", name="date_order"),
        Index("ix_projects_published_order", "is_published", "display_order"),
    )

    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    subtitle: Mapped[str | None] = mapped_column(String(160))
    summary: Mapped[str] = mapped_column(String(400), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    # A project cannot be left without a primary category, so deleting one in use is blocked.
    category_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("project_categories.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    subcategory: Mapped[str | None] = mapped_column(String(80))
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="planned")
    label: Mapped[str | None] = mapped_column(String(60))
    role: Mapped[str | None] = mapped_column(String(150))
    start_date: Mapped[str | None] = mapped_column(String(7))
    end_date: Mapped[str | None] = mapped_column(String(7))

    # Case study
    problem: Mapped[str | None] = mapped_column(Text)
    architecture: Mapped[str | None] = mapped_column(Text)
    contribution: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list, server_default="{}")
    implementation: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list, server_default="{}")
    challenges: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list, server_default="{}")
    lessons: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list, server_default="{}")
    next_steps: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list, server_default="{}")
    # Ordered value objects, always edited together with the project and validated by
    # Pydantic before they reach the database (see app/schemas/project.py).
    features: Mapped[list[dict]] = mapped_column(JSONB, nullable=False, default=list, server_default=text("'[]'"))
    decisions: Mapped[list[dict]] = mapped_column(JSONB, nullable=False, default=list, server_default=text("'[]'"))
    results: Mapped[list[dict]] = mapped_column(JSONB, nullable=False, default=list, server_default=text("'[]'"))
    images: Mapped[list[dict]] = mapped_column(JSONB, nullable=False, default=list, server_default=text("'[]'"))
    evaluation_note: Mapped[str | None] = mapped_column(Text)
    notice_title: Mapped[str | None] = mapped_column(String(150))
    notice_body: Mapped[str | None] = mapped_column(Text)

    # Links
    github_url: Mapped[str | None] = mapped_column(String(2048))
    demo_url: Mapped[str | None] = mapped_column(String(2048))
    docs_url: Mapped[str | None] = mapped_column(String(2048))
    video_url: Mapped[str | None] = mapped_column(String(2048))

    # Publishing
    is_featured: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    category: Mapped[ProjectCategory] = relationship(lazy="joined")
    secondary_categories: Mapped[list[ProjectCategory]] = relationship(
        secondary=project_category_links, lazy="selectin", order_by=ProjectCategory.display_order
    )
    technology_links: Mapped[list[ProjectTechnology]] = relationship(
        cascade="all, delete-orphan", lazy="selectin", order_by=ProjectTechnology.position
    )

    @property
    def technologies(self) -> list[str]:
        return [link.technology.name for link in self.technology_links]
