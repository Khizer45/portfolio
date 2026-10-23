from sqlalchemy import Boolean, CheckConstraint, Index, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, Timestamps, UUIDPrimaryKey
from app.models.enums import PARTIAL_DATE_SQL, AchievementType, EmploymentType, WorkMode, check_in


def _date_checks(start: str, end: str) -> tuple[CheckConstraint, ...]:
    return (
        CheckConstraint(f"{start} ~ {PARTIAL_DATE_SQL}", name=f"{start}_format"),
        CheckConstraint(f"{end} IS NULL OR {end} ~ {PARTIAL_DATE_SQL}", name=f"{end}_format"),
        CheckConstraint(f"{end} IS NULL OR {end} >= {start}", name="date_order"),
    )


class Experience(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "experiences"
    __table_args__ = (
        CheckConstraint(check_in("employment_type", EmploymentType), name="employment_type"),
        CheckConstraint(f"work_mode IS NULL OR {check_in('work_mode', WorkMode)}", name="work_mode"),
        CheckConstraint("NOT (is_current AND end_date IS NOT NULL)", name="current_has_no_end"),
        *_date_checks("start_date", "end_date"),
        Index("ix_experiences_visible_order", "is_visible", "display_order"),
    )

    organization: Mapped[str] = mapped_column(String(150), nullable=False)
    organization_url: Mapped[str | None] = mapped_column(String(2048))
    # Freelance work under NDA: the public site shows "Confidential client".
    is_confidential: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    role: Mapped[str] = mapped_column(String(150), nullable=False)
    employment_type: Mapped[str] = mapped_column(String(20), nullable=False)
    location: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    work_mode: Mapped[str | None] = mapped_column(String(20))
    start_date: Mapped[str] = mapped_column(String(7), nullable=False)
    end_date: Mapped[str | None] = mapped_column(String(7))
    is_current: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    description: Mapped[str | None] = mapped_column(Text)
    responsibilities: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list, server_default="{}")
    achievements: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list, server_default="{}")
    technologies: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list, server_default="{}")
    link_label: Mapped[str | None] = mapped_column(String(80))
    link_url: Mapped[str | None] = mapped_column(String(2048))
    is_visible: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class Certification(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "certifications"
    __table_args__ = (*_date_checks("issue_date", "expiration_date"),)

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    issuer: Mapped[str] = mapped_column(String(150), nullable=False)
    issue_date: Mapped[str] = mapped_column(String(7), nullable=False)
    expiration_date: Mapped[str | None] = mapped_column(String(7))
    credential_id: Mapped[str | None] = mapped_column(String(120))
    verification_url: Mapped[str | None] = mapped_column(String(2048))
    # Link to the certificate image or PDF (external URL or a file in the frontend's public/ folder).
    file_url: Mapped[str | None] = mapped_column(String(2048))
    related_skills: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list, server_default="{}")
    description: Mapped[str | None] = mapped_column(Text)
    is_visible: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class Education(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "education"
    __table_args__ = (
        *_date_checks("start_date", "end_date"),
        # At most one primary entry (the one highlighted on the home page).
        Index("uq_education_primary", "is_primary", unique=True, postgresql_where=text("is_primary")),
    )

    institution: Mapped[str] = mapped_column(String(200), nullable=False)
    qualification: Mapped[str] = mapped_column(String(150), nullable=False)
    field_of_study: Mapped[str | None] = mapped_column(String(150))
    location: Mapped[str | None] = mapped_column(String(120))
    start_date: Mapped[str] = mapped_column(String(7), nullable=False)
    end_date: Mapped[str | None] = mapped_column(String(7))
    grade: Mapped[str | None] = mapped_column(String(60))
    description: Mapped[str | None] = mapped_column(Text)
    highlights: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list, server_default="{}")
    coursework: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list, server_default="{}")
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_visible: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class Achievement(UUIDPrimaryKey, Timestamps, Base):
    """Awards, scholarships, competitions, and publications."""

    __tablename__ = "achievements"
    __table_args__ = (
        CheckConstraint(check_in("type", AchievementType), name="type"),
        CheckConstraint(f"date ~ {PARTIAL_DATE_SQL}", name="date_format"),
    )

    type: Mapped[str] = mapped_column(String(20), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    issuer: Mapped[str] = mapped_column(String(150), nullable=False)
    date: Mapped[str] = mapped_column(String(7), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    url: Mapped[str | None] = mapped_column(String(2048))
    is_visible: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
