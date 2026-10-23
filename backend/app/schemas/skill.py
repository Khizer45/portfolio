import uuid
from datetime import datetime

from app.models.enums import SkillLevel
from app.schemas.common import DisplayOrder, ReadSchema, Schema, optional_slug, optional_text, text


class SkillCategoryWrite(Schema):
    title: text(120)
    slug: optional_slug(80) = None
    description: optional_text(1000) = None
    display_order: DisplayOrder = 0


class SkillCategoryRead(ReadSchema):
    id: uuid.UUID
    slug: str
    title: str
    description: str | None
    display_order: int
    skill_count: int = 0
    created_at: datetime
    updated_at: datetime


class SkillWrite(Schema):
    name: text(80)
    category_id: uuid.UUID
    level: SkillLevel = "beginner"
    description: optional_text(1000) = None
    is_learning: bool = False
    is_featured: bool = False
    is_visible: bool = True
    display_order: DisplayOrder = 0
    evidence_project_id: uuid.UUID | None = None


class SkillFlagsUpdate(Schema):
    is_visible: bool | None = None
    is_featured: bool | None = None
    display_order: DisplayOrder | None = None


class ProjectRef(ReadSchema):
    id: uuid.UUID
    slug: str
    title: str


class SkillCategoryRef(ReadSchema):
    id: uuid.UUID
    slug: str
    title: str


class SkillRead(ReadSchema):
    id: uuid.UUID
    name: str
    category_id: uuid.UUID
    category: SkillCategoryRef
    level: str
    description: str | None
    is_learning: bool
    is_featured: bool
    is_visible: bool
    display_order: int
    evidence_project_id: uuid.UUID | None
    evidence_project: ProjectRef | None
    created_at: datetime
    updated_at: datetime


class PublicProjectRef(ReadSchema):
    slug: str
    title: str


class PublicSkill(ReadSchema):
    name: str
    level: str
    description: str | None
    is_learning: bool
    is_featured: bool
    evidence_project: PublicProjectRef | None


class PublicSkillGroup(ReadSchema):
    slug: str
    title: str
    description: str | None
    skills: list[PublicSkill]
