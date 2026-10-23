import uuid

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Index, Integer, String, Text, Uuid, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, Timestamps, UUIDPrimaryKey
from app.models.enums import SkillLevel, check_in
from app.models.project import Project


class SkillCategory(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "skill_categories"

    slug: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class Skill(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "skills"
    __table_args__ = (
        CheckConstraint(check_in("level", SkillLevel), name="level"),
        # Case-insensitive uniqueness: "Python" and "python" are the same skill.
        Index("uq_skills_name_lower", text("lower(name)"), unique=True),
        Index("ix_skills_category_order", "category_id", "display_order"),
    )

    name: Mapped[str] = mapped_column(String(80), nullable=False)
    category_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("skill_categories.id", ondelete="RESTRICT"), nullable=False
    )
    level: Mapped[str] = mapped_column(String(20), nullable=False, default="beginner")
    description: Mapped[str | None] = mapped_column(Text)
    is_learning: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_featured: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_visible: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # Deleting the project keeps the skill and just removes the evidence link.
    evidence_project_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("projects.id", ondelete="SET NULL"), index=True
    )

    category: Mapped[SkillCategory] = relationship(lazy="joined")
    evidence_project: Mapped[Project | None] = relationship(lazy="joined")
