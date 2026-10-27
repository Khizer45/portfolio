from datetime import datetime
from typing import Annotated

from pydantic import EmailStr, Field, field_validator

from app.schemas.common import (
    HttpUrlStr,
    LinkOrPath,
    OptionalHttpUrl,
    OptionalLinkOrPath,
    ReadSchema,
    Schema,
    TagList,
    TextList,
    optional_text,
    text,
)


class SocialLink(Schema):
    label: text(40)
    url: HttpUrlStr


class NavLink(Schema):
    """An extra menu link: a page on this site ("/writing") or an external URL."""

    label: text(40)
    url: LinkOrPath


class ProfileWrite(Schema):
    display_name: text(100)
    role: optional_text(150) = None
    headline: text(200)
    intro: optional_text(600) = None
    biography: optional_text(10000) = None
    location: optional_text(120) = None
    contact_email: EmailStr | None = None
    github_url: OptionalHttpUrl = None
    linkedin_url: OptionalHttpUrl = None
    cv_url: OptionalLinkOrPath = None
    profile_image_url: OptionalLinkOrPath = None
    social_links: Annotated[list[SocialLink], Field(max_length=12)] = []
    nav_links: Annotated[list[NavLink], Field(max_length=6)] = []
    footer_text: optional_text(300) = None
    availability_open: bool = True
    availability_label: optional_text(150) = None
    focus_areas: TagList = []
    spoken_languages: TagList = []
    career_interests: TagList = []
    interests: TextList = []
    approach: TextList = []
    seeking: TextList = []

    @field_validator("contact_email", mode="before")
    @classmethod
    def _empty_email(cls, value: object) -> object:
        return None if isinstance(value, str) and not value.strip() else value


class ProfileRead(ReadSchema):
    display_name: str
    role: str
    headline: str
    intro: str
    biography: str
    location: str
    contact_email: str | None
    github_url: str | None
    linkedin_url: str | None
    cv_url: str | None
    profile_image_url: str | None
    social_links: list[SocialLink]
    nav_links: list[NavLink]
    footer_text: str
    availability_open: bool
    availability_label: str
    focus_areas: list[str]
    spoken_languages: list[str]
    career_interests: list[str]
    interests: list[str]
    approach: list[str]
    seeking: list[str]
    updated_at: datetime
