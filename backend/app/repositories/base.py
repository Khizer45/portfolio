"""Generic query helpers shared by the resource repositories and routers."""

import uuid
from collections.abc import Sequence
from typing import Any

from sqlalchemy import Select, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import FieldValidationError, NotFoundError, integrity_error_to_app_error


def get_or_404[M](db: Session, model: type[M], item_id: uuid.UUID, name: str = "Item") -> M:
    item = db.get(model, item_id)
    if item is None:
        raise NotFoundError(f"{name} not found.")
    return item


def paginate(db: Session, stmt: Select, page: int, page_size: int) -> tuple[list[Any], int]:
    total = db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery())) or 0
    items = list(db.scalars(stmt.limit(page_size).offset((page - 1) * page_size)).unique())
    return items, total


def apply_search(stmt: Select, columns: Sequence[Any], search: str | None) -> Select:
    """Case-insensitive search: every word must match at least one column."""
    if not search:
        return stmt
    for term in search.split()[:8]:
        escaped = term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        stmt = stmt.where(or_(*(column.ilike(f"%{escaped}%", escape="\\") for column in columns)))
    return stmt


def reorder(db: Session, model: type, ids: Sequence[uuid.UUID]) -> None:
    """Set display_order to match the given order (0, 10, 20, … leaves room for manual edits)."""
    if len(set(ids)) != len(ids):
        raise FieldValidationError("ids", "Each id may appear only once.")
    rows = {row.id: row for row in db.scalars(select(model).where(model.id.in_(ids)))}
    missing = [str(i) for i in ids if i not in rows]
    if missing:
        raise FieldValidationError("ids", f"Unknown id(s): {', '.join(missing[:5])}")
    for index, item_id in enumerate(ids):
        rows[item_id].display_order = index * 10


def ensure_exists(db: Session, model: type, item_id: uuid.UUID | None, field: str, name: str) -> None:
    if item_id is not None and db.get(model, item_id) is None:
        raise FieldValidationError(field, f"{name} not found.")


def commit(db: Session) -> None:
    """Commit, turning constraint violations into friendly API errors."""
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise integrity_error_to_app_error(exc) from exc


def flush(db: Session) -> None:
    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise integrity_error_to_app_error(exc) from exc
