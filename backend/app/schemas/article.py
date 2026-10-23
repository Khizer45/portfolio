import uuid
from datetime import datetime
from typing import Annotated

from pydantic import Field, StringConstraints, model_validator

from app.core.errors import FieldValueError
from app.models.enums import ArticleStatus
from app.schemas.common import OptionalHttpUrl, OptionalSlug, ReadSchema, Schema, TagList, text
from app.schemas.skill import ProjectRef, PublicProjectRef


class ArticleWrite(Schema):
    title: text(200)
    slug: OptionalSlug = None
    summary: text(500)
    content: Annotated[str, StringConstraints(max_length=200_000)] = ""
    tags: TagList = []
    status: ArticleStatus = "draft"
    external_url: OptionalHttpUrl = None
    related_project_id: uuid.UUID | None = None

    @model_validator(mode="after")
    def _check(self) -> "ArticleWrite":
        if self.status == "published" and not self.content.strip() and not self.external_url:
            raise FieldValueError("content", "A published article needs content or an external URL.")
        return self


class ArticleStatusUpdate(Schema):
    status: ArticleStatus


class ArticleAdminRead(ReadSchema):
    id: uuid.UUID
    slug: str
    title: str
    summary: str
    content: str
    tags: list[str]
    status: str
    external_url: str | None
    related_project_id: uuid.UUID | None
    related_project: ProjectRef | None
    published_at: datetime | None
    created_at: datetime
    updated_at: datetime


class PublicArticleSummary(ReadSchema):
    slug: str
    title: str
    summary: str
    tags: list[str]
    external_url: str | None
    related_project: PublicProjectRef | None
    published_at: datetime | None
    updated_at: datetime
    reading_minutes: int = Field(default=1)


class PublicArticle(PublicArticleSummary):
    content: str
