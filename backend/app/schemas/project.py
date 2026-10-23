import uuid
from datetime import datetime
from typing import Annotated

from pydantic import Field, model_validator

from app.core.errors import FieldValueError
from app.models.enums import CategoryIcon, FeatureStatus, ImageKind, ProjectStatus
from app.schemas.common import (
    DisplayOrder,
    LinkOrPath,
    OptionalHttpUrl,
    OptionalPartialDate,
    OptionalSlug,
    ReadSchema,
    Schema,
    TagList,
    TextList,
    check_date_order,
    optional_slug,
    optional_text,
    text,
)
from app.services.slugs import technology_slug

# --------------------------------------------------------------------------- #
# Categories & technologies
# --------------------------------------------------------------------------- #


class ProjectCategoryWrite(Schema):
    title: text(120)
    slug: optional_slug(80) = None
    short_title: text(60)
    description: optional_text(2000) = None
    focus_areas: TextList = []
    icon: CategoryIcon = "layers"
    display_order: DisplayOrder = 0


class ProjectCategoryRead(ReadSchema):
    id: uuid.UUID
    slug: str
    title: str
    short_title: str
    description: str
    focus_areas: list[str]
    icon: str
    display_order: int
    project_count: int = 0
    created_at: datetime
    updated_at: datetime


class OrderUpdate(Schema):
    display_order: DisplayOrder


class CategoryRef(ReadSchema):
    id: uuid.UUID
    slug: str
    title: str


class PublicCategory(ReadSchema):
    slug: str
    title: str
    short_title: str
    description: str
    focus_areas: list[str]
    icon: str
    project_count: int = 0


class PublicCategoryRef(ReadSchema):
    slug: str
    title: str
    short_title: str
    icon: str


class TechnologyRead(ReadSchema):
    id: uuid.UUID
    name: str
    slug: str
    project_count: int = 0


class TechnologyUpdate(Schema):
    name: text(60)


# --------------------------------------------------------------------------- #
# Project value objects
# --------------------------------------------------------------------------- #


class ProjectFeature(Schema):
    name: text(150)
    status: FeatureStatus = "planned"
    description: optional_text(500) = None


class ProjectDecision(Schema):
    title: text(150)
    detail: text(2000)


class ProjectMetric(Schema):
    """A measured result. The `context` says how it was measured."""

    label: text(100)
    value: text(50)
    context: optional_text(300) = None


class ProjectImage(Schema):
    url: LinkOrPath
    alt: text(300)
    caption: optional_text(300) = None
    kind: ImageKind = "screenshot"
    width: Annotated[int, Field(ge=1, le=10000)] | None = None
    height: Annotated[int, Field(ge=1, le=10000)] | None = None


# --------------------------------------------------------------------------- #
# Project write / read
# --------------------------------------------------------------------------- #


class ProjectWrite(Schema):
    """Body for creating (POST) or fully updating (PUT) a project."""

    title: text(120)
    slug: OptionalSlug = None
    subtitle: optional_text(160) = None
    summary: text(400)
    description: optional_text(20000) = None
    category_id: uuid.UUID
    secondary_category_ids: Annotated[list[uuid.UUID], Field(max_length=12)] = []
    subcategory: optional_text(80) = None
    status: ProjectStatus = "planned"
    label: optional_text(60) = None
    role: optional_text(150) = None
    start_date: OptionalPartialDate = None
    end_date: OptionalPartialDate = None
    technologies: TagList = []

    problem: optional_text(5000) = None
    architecture: optional_text(10000) = None
    contribution: TextList = []
    implementation: TextList = []
    challenges: TextList = []
    lessons: TextList = []
    next_steps: TextList = []
    features: Annotated[list[ProjectFeature], Field(max_length=50)] = []
    decisions: Annotated[list[ProjectDecision], Field(max_length=30)] = []
    results: Annotated[list[ProjectMetric], Field(max_length=30)] = []
    images: Annotated[list[ProjectImage], Field(max_length=30)] = []
    evaluation_note: optional_text(2000) = None
    notice_title: optional_text(150) = None
    notice_body: optional_text(2000) = None

    github_url: OptionalHttpUrl = None
    demo_url: OptionalHttpUrl = None
    docs_url: OptionalHttpUrl = None
    video_url: OptionalHttpUrl = None

    is_featured: bool = False
    is_published: bool = False
    display_order: DisplayOrder = 0

    @model_validator(mode="after")
    def _check(self) -> "ProjectWrite":
        check_date_order(self.start_date, self.end_date)
        # Technologies: the same name in another case is dropped (first spelling wins);
        # different names that would be stored as one technology are an error.
        seen: dict[str, str] = {}
        for name in self.technologies:
            first = seen.setdefault(technology_slug(name), name)
            if first.lower() != name.lower():
                raise FieldValueError("technologies", f"'{first}' and '{name}' count as the same technology.")
        self.technologies = list(seen.values())
        self.secondary_category_ids = [c for c in dict.fromkeys(self.secondary_category_ids) if c != self.category_id]
        if bool(self.notice_title) != bool(self.notice_body):
            missing = "notice_body" if self.notice_title else "notice_title"
            raise FieldValueError(missing, "A notice needs both a title and a body.")
        return self


class ProjectFlagsUpdate(Schema):
    """Quick toggles from the project list (PATCH)."""

    is_published: bool | None = None
    is_featured: bool | None = None
    display_order: DisplayOrder | None = None


class ProjectAdminListItem(ReadSchema):
    id: uuid.UUID
    slug: str
    title: str
    subtitle: str | None
    status: str
    category: CategoryRef
    technologies: list[str]
    is_published: bool
    is_featured: bool
    display_order: int
    updated_at: datetime


class ProjectAdminRead(ReadSchema):
    id: uuid.UUID
    slug: str
    title: str
    subtitle: str | None
    summary: str
    description: str | None
    category_id: uuid.UUID
    category: CategoryRef
    secondary_category_ids: list[uuid.UUID]
    subcategory: str | None
    status: str
    label: str | None
    role: str | None
    start_date: str | None
    end_date: str | None
    technologies: list[str]
    problem: str | None
    architecture: str | None
    contribution: list[str]
    implementation: list[str]
    challenges: list[str]
    lessons: list[str]
    next_steps: list[str]
    features: list[ProjectFeature]
    decisions: list[ProjectDecision]
    results: list[ProjectMetric]
    images: list[ProjectImage]
    evaluation_note: str | None
    notice_title: str | None
    notice_body: str | None
    github_url: str | None
    demo_url: str | None
    docs_url: str | None
    video_url: str | None
    is_featured: bool
    is_published: bool
    published_at: datetime | None
    display_order: int
    created_at: datetime
    updated_at: datetime


class RelatedArticle(ReadSchema):
    slug: str
    title: str
    published_at: datetime | None
    external_url: str | None


class ProjectPublicSummary(ReadSchema):
    slug: str
    title: str
    subtitle: str | None
    summary: str
    label: str | None
    status: str
    is_featured: bool
    technologies: list[str]
    category: PublicCategoryRef
    categories: list[PublicCategoryRef]
    cover_image: ProjectImage | None
    start_date: str | None
    end_date: str | None


class ProjectPublicDetail(ProjectPublicSummary):
    description: str | None
    subcategory: str | None
    role: str | None
    problem: str | None
    architecture: str | None
    contribution: list[str]
    implementation: list[str]
    challenges: list[str]
    lessons: list[str]
    next_steps: list[str]
    features: list[ProjectFeature]
    decisions: list[ProjectDecision]
    results: list[ProjectMetric]
    images: list[ProjectImage]
    evaluation_note: str | None
    notice_title: str | None
    notice_body: str | None
    github_url: str | None
    demo_url: str | None
    docs_url: str | None
    video_url: str | None
    related_articles: list[RelatedArticle] = []
