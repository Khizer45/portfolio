"""Shared field types and validators used by every schema."""

import math
import re
import uuid
from typing import Annotated
from urllib.parse import unquote, urlsplit

from pydantic import AfterValidator, BaseModel, BeforeValidator, ConfigDict, Field, StringConstraints, model_validator

from app.core.errors import FieldValueError
from app.models.enums import PARTIAL_DATE_PATTERN

_SLUG = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
# Site-relative path to a file served by the frontend, e.g. "/cv/Khizer-Hayat-CV.pdf".
# '%' only as an escape (%20); the frontend decodes these paths.
_RELATIVE_PATH = re.compile(r"^/(?!/)(?:[A-Za-z0-9._~\-/()+]|%[0-9A-Fa-f]{2})*$")
_PATH_ERROR = "Paths must start with / and use only letters, numbers, - _ . / and escapes such as %20."


def _blank_to_none(value: object) -> object:
    if isinstance(value, str) and not value.strip():
        return None
    return value


def _check_length(value: str) -> str:
    if len(value) > 2048:
        raise ValueError("URL must be at most 2048 characters.")
    return value


def _check_absolute_url(value: str) -> str:
    value = _check_length(value.strip())
    if any(ch.isspace() for ch in value):
        raise ValueError("URL must not contain spaces.")
    parts = urlsplit(value)
    if parts.scheme not in ("http", "https") or not parts.netloc:
        raise ValueError("Enter a full URL starting with https:// (or http://).")
    return value


def _check_link_or_path(value: str) -> str:
    value = _check_length(value.strip())
    if value.startswith("/"):
        try:
            decoded = unquote(value, errors="strict")
        except UnicodeDecodeError:
            raise ValueError(_PATH_ERROR) from None
        if (
            not _RELATIVE_PATH.match(value)
            or decoded.startswith("//")
            or ".." in decoded.split("/")
            or "\\" in decoded
            or any(ord(ch) < 32 or ord(ch) == 127 for ch in decoded)
        ):
            raise ValueError(_PATH_ERROR)
        return value
    return _check_absolute_url(value)


def _check_slug(value: str) -> str:
    if not _SLUG.match(value):
        raise ValueError("Use lowercase letters, numbers, and single dashes, e.g. 'my-project'.")
    return value


def text(max_length: int, min_length: int = 1):
    """Required text, trimmed."""
    return Annotated[str, StringConstraints(strip_whitespace=True, min_length=min_length, max_length=max_length)]


def optional_text(max_length: int):
    """Optional text: empty strings become None."""
    # Constraints apply to the str branch only, so an explicit null is accepted.
    return Annotated[
        Annotated[str, StringConstraints(strip_whitespace=True, max_length=max_length)] | None,
        BeforeValidator(_blank_to_none),
    ]


# Absolute http(s) URL. Optional variants treat "" as "not set".
HttpUrlStr = Annotated[str, AfterValidator(_check_absolute_url)]
OptionalHttpUrl = Annotated[HttpUrlStr | None, BeforeValidator(_blank_to_none)]
# Absolute URL, or a path to a file in the frontend's public/ folder.
LinkOrPath = Annotated[str, AfterValidator(_check_link_or_path)]
OptionalLinkOrPath = Annotated[LinkOrPath | None, BeforeValidator(_blank_to_none)]


# "#1f2a55"-style colour, stored lowercase. Optional: "" means "use the theme's colour".
HexColor = Annotated[str, StringConstraints(strip_whitespace=True, to_lower=True, pattern=r"^#[0-9a-fA-F]{6}$")]
OptionalHexColor = Annotated[HexColor | None, BeforeValidator(_blank_to_none)]


def optional_slug(max_length: int = 100):
    """Optional URL slug; `max_length` must not exceed the slug column's length."""
    slug = Annotated[
        str,
        StringConstraints(strip_whitespace=True, to_lower=True, min_length=1, max_length=max_length),
        AfterValidator(_check_slug),
    ]
    return Annotated[slug | None, BeforeValidator(_blank_to_none)]


OptionalSlug = optional_slug()

PartialDate = Annotated[str, StringConstraints(strip_whitespace=True, pattern=PARTIAL_DATE_PATTERN)]
OptionalPartialDate = Annotated[PartialDate | None, BeforeValidator(_blank_to_none)]

ListItem = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1000)]
TextList = Annotated[list[ListItem], Field(max_length=50)]
TagItem = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=60)]
TagList = Annotated[list[TagItem], Field(max_length=40)]

DisplayOrder = Annotated[int, Field(ge=0, le=100_000)]


def check_date_order(
    start: str | None, end: str | None, end_field: str = "end_date", start_label: str = "start date"
) -> None:
    if start and end and end < start:
        label = end_field.replace("_", " ").capitalize()
        raise FieldValueError(end_field, f"{label} must not be before the {start_label}.")


def _nul_path(value: object, path: tuple = ()) -> tuple | None:
    """Location of the first string containing a NUL character, which PostgreSQL can't store."""
    if isinstance(value, str):
        return path if "\x00" in value else None
    items = value.items() if isinstance(value, dict) else enumerate(value) if isinstance(value, list) else ()
    for key, item in items:
        found = _nul_path(item, (*path, key))
        if found is not None:
            return found
    return None


class Schema(BaseModel):
    model_config = ConfigDict(from_attributes=True, extra="forbid")

    @model_validator(mode="before")
    @classmethod
    def _reject_nul(cls, data: object) -> object:
        path = _nul_path(data)
        if path:
            raise FieldValueError(".".join(map(str, path)), "Text must not contain NUL characters.")
        return data


class ReadSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Page[T](BaseModel):
    items: list[T]
    total: int
    page: int
    page_size: int
    pages: int

    @classmethod
    def build(cls, items: list[T], total: int, page: int, page_size: int) -> "Page[T]":
        return cls(items=items, total=total, page=page, page_size=page_size, pages=max(1, math.ceil(total / page_size)))


class ReorderRequest(Schema):
    """IDs in the desired display order."""

    ids: Annotated[list[uuid.UUID], Field(min_length=1, max_length=500)]


class Message(BaseModel):
    detail: str
