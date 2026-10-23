import uuid
from datetime import datetime

from pydantic import model_validator

from app.core.errors import FieldValueError
from app.models.enums import AchievementType, EmploymentType, WorkMode
from app.schemas.common import (
    DisplayOrder,
    OptionalHttpUrl,
    OptionalLinkOrPath,
    OptionalPartialDate,
    PartialDate,
    ReadSchema,
    Schema,
    TagList,
    TextList,
    check_date_order,
    optional_text,
    text,
)


class VisibilityUpdate(Schema):
    """Quick toggles from list pages (PATCH)."""

    is_visible: bool | None = None
    display_order: DisplayOrder | None = None


# --------------------------------------------------------------------------- #
# Experience
# --------------------------------------------------------------------------- #


class ExperienceWrite(Schema):
    organization: text(150)
    organization_url: OptionalHttpUrl = None
    is_confidential: bool = False
    role: text(150)
    employment_type: EmploymentType
    location: optional_text(120) = None
    work_mode: WorkMode | None = None
    start_date: PartialDate
    end_date: OptionalPartialDate = None
    is_current: bool = False
    description: optional_text(5000) = None
    responsibilities: TextList = []
    achievements: TextList = []
    technologies: TagList = []
    link_label: optional_text(80) = None
    link_url: OptionalHttpUrl = None
    is_visible: bool = True
    display_order: DisplayOrder = 0

    @model_validator(mode="after")
    def _check(self) -> "ExperienceWrite":
        if self.is_current and self.end_date:
            raise FieldValueError("end_date", "A current position cannot have an end date.")
        check_date_order(self.start_date, self.end_date)
        if self.link_url and not self.link_label:
            self.link_label = "Learn more"
        return self


class ExperienceRead(ReadSchema):
    id: uuid.UUID
    organization: str
    organization_url: str | None
    is_confidential: bool
    role: str
    employment_type: str
    location: str
    work_mode: str | None
    start_date: str
    end_date: str | None
    is_current: bool
    description: str | None
    responsibilities: list[str]
    achievements: list[str]
    technologies: list[str]
    link_label: str | None
    link_url: str | None
    is_visible: bool
    display_order: int
    created_at: datetime
    updated_at: datetime


class PublicExperience(ReadSchema):
    id: uuid.UUID
    organization: str
    organization_url: str | None
    role: str
    employment_type: str
    location: str
    work_mode: str | None
    start_date: str
    end_date: str | None
    is_current: bool
    description: str | None
    responsibilities: list[str]
    achievements: list[str]
    technologies: list[str]
    link_label: str | None
    link_url: str | None


# --------------------------------------------------------------------------- #
# Certifications
# --------------------------------------------------------------------------- #


class CertificationWrite(Schema):
    name: text(200)
    issuer: text(150)
    issue_date: PartialDate
    expiration_date: OptionalPartialDate = None
    credential_id: optional_text(120) = None
    verification_url: OptionalHttpUrl = None
    file_url: OptionalLinkOrPath = None
    related_skills: TagList = []
    description: optional_text(2000) = None
    is_visible: bool = True
    display_order: DisplayOrder = 0

    @model_validator(mode="after")
    def _check(self) -> "CertificationWrite":
        check_date_order(self.issue_date, self.expiration_date, "expiration_date", "issue date")
        return self


class CertificationRead(ReadSchema):
    id: uuid.UUID
    name: str
    issuer: str
    issue_date: str
    expiration_date: str | None
    credential_id: str | None
    verification_url: str | None
    file_url: str | None
    related_skills: list[str]
    description: str | None
    is_visible: bool
    display_order: int
    created_at: datetime
    updated_at: datetime


class PublicCertification(ReadSchema):
    id: uuid.UUID
    name: str
    issuer: str
    issue_date: str
    expiration_date: str | None
    credential_id: str | None
    verification_url: str | None
    file_url: str | None
    related_skills: list[str]
    description: str | None


# --------------------------------------------------------------------------- #
# Education
# --------------------------------------------------------------------------- #


class EducationWrite(Schema):
    institution: text(200)
    qualification: text(150)
    field_of_study: optional_text(150) = None
    location: optional_text(120) = None
    start_date: PartialDate
    end_date: OptionalPartialDate = None
    grade: optional_text(60) = None
    description: optional_text(3000) = None
    highlights: TextList = []
    coursework: TagList = []
    is_primary: bool = False
    is_visible: bool = True
    display_order: DisplayOrder = 0

    @model_validator(mode="after")
    def _check(self) -> "EducationWrite":
        check_date_order(self.start_date, self.end_date)
        return self


class EducationRead(ReadSchema):
    id: uuid.UUID
    institution: str
    qualification: str
    field_of_study: str | None
    location: str | None
    start_date: str
    end_date: str | None
    grade: str | None
    description: str | None
    highlights: list[str]
    coursework: list[str]
    is_primary: bool
    is_visible: bool
    display_order: int
    created_at: datetime
    updated_at: datetime


class PublicEducation(ReadSchema):
    id: uuid.UUID
    institution: str
    qualification: str
    field_of_study: str | None
    location: str | None
    start_date: str
    end_date: str | None
    grade: str | None
    description: str | None
    highlights: list[str]
    coursework: list[str]
    is_primary: bool


# --------------------------------------------------------------------------- #
# Achievements (awards, scholarships, competitions, publications)
# --------------------------------------------------------------------------- #


class AchievementWrite(Schema):
    type: AchievementType
    title: text(200)
    issuer: text(150)
    date: PartialDate
    description: optional_text(2000) = None
    url: OptionalHttpUrl = None
    is_visible: bool = True
    display_order: DisplayOrder = 0


class AchievementRead(ReadSchema):
    id: uuid.UUID
    type: str
    title: str
    issuer: str
    date: str
    description: str | None
    url: str | None
    is_visible: bool
    display_order: int
    created_at: datetime
    updated_at: datetime


class PublicAchievement(ReadSchema):
    id: uuid.UUID
    type: str
    title: str
    issuer: str
    date: str
    description: str | None
    url: str | None
