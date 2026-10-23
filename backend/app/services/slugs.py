import re
import unicodedata
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session


def slugify(value: str, max_length: int = 100) -> str:
    """'Local AI Lab — Benchmarks' → 'local-ai-lab-benchmarks'."""
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_value.lower()).strip("-")
    return slug[:max_length].rstrip("-") or "item"


def technology_slug(name: str) -> str:
    """Identity of a technology, ignoring case and punctuation: 'C#' → 'csharp', 'C++' → 'cplusplus',
    'Next.js' → 'next-js'. Unlike slugify, letters of every script are kept ('Русский' → 'русский')."""
    value = unicodedata.normalize("NFKC", name).lower().replace("#", "sharp").replace("+", "plus")
    value = value.replace("&", "and")
    # Letters, digits, and combining marks stay; every other run of characters becomes one dash.
    kept = "".join(ch if ch.isalnum() or unicodedata.category(ch).startswith("M") else " " for ch in value)
    return "-".join(kept.split())[:80].rstrip("-") or value.strip()[:80]


def _slug_length(model: type) -> int:
    return min(100, model.__table__.c.slug.type.length)


def unique_slug(db: Session, model: type, base: str, exclude_id: uuid.UUID | None = None) -> str:
    """`base`, or `base-2`, `base-3`, … if taken by another row."""
    max_length = _slug_length(model)
    candidate, n = base, 2
    while True:
        stmt = select(model.id).where(model.slug == candidate)
        if exclude_id is not None:
            stmt = stmt.where(model.id != exclude_id)
        if db.scalar(stmt) is None:
            return candidate
        suffix = f"-{n}"
        candidate = f"{base[: max_length - len(suffix)]}{suffix}"
        n += 1


def resolve_slug(
    db: Session,
    model: type,
    requested: str | None,
    title: str,
    existing: str | None = None,
    item_id: uuid.UUID | None = None,
) -> str:
    """Explicit slug wins (conflicts are reported as 409); otherwise keep the current slug, or derive one."""
    if requested:
        return requested
    if existing:
        return existing
    return unique_slug(db, model, slugify(title, _slug_length(model)), exclude_id=item_id)
