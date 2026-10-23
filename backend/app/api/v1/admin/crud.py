"""Builds a standard admin CRUD router for a resource.

Every generated route depends on `require_admin` (session + CSRF), validates its body
with the resource's Pydantic schema, and writes an audit log entry for each change.

    GET    /admin/<name>            list (search, visibility filter, pagination)
    POST   /admin/<name>            create
    GET    /admin/<name>/{id}       read
    PUT    /admin/<name>/{id}       replace
    PATCH  /admin/<name>/{id}       quick toggles (visibility, order, …)
    DELETE /admin/<name>/{id}       delete
    POST   /admin/<name>/reorder    set display order from a list of ids
"""

import uuid
from collections.abc import Callable, Sequence
from dataclasses import dataclass, field
from typing import Annotated, Any

from fastapi import APIRouter, Query, Response, status
from pydantic import BaseModel
from sqlalchemy import String, Text, select
from sqlalchemy.orm import Session

from app.api.deps import Admin, DbSession, PageNumber
from app.repositories.base import apply_search, commit, flush, get_or_404, paginate, reorder
from app.schemas.common import Message, Page, ReorderRequest
from app.services import audit

# (db, values, existing item or None) -> values to set on the model
Prepare = Callable[[Session, dict[str, Any], Any | None], dict[str, Any]]


@dataclass
class CrudResource:
    name: str
    entity_type: str
    title: str
    model: type
    write_schema: type[BaseModel]
    read_schema: type[BaseModel]
    label: Callable[[Any], str]
    search_columns: Sequence[Any]
    order_by: Sequence[Any]
    flags_schema: type[BaseModel] | None = None
    visibility_column: Any | None = None
    prepare: Prepare | None = None
    serialize: Callable[[Session, Any], BaseModel] | None = None
    extra_routes: Callable[[APIRouter], None] | None = None
    tags: list[str] = field(default_factory=list)


def build_crud_router(resource: CrudResource) -> APIRouter:
    router = APIRouter(prefix=f"/{resource.name}", tags=resource.tags or [f"admin: {resource.name}"])
    model = resource.model
    write_schema = resource.write_schema
    read_schema = resource.read_schema
    flags_schema = resource.flags_schema

    def serialize(db: Session, item: Any) -> BaseModel:
        return resource.serialize(db, item) if resource.serialize else read_schema.model_validate(item)

    # Text columns that are NOT NULL store "" rather than None.
    not_null_text = {c.key for c in model.__table__.columns if not c.nullable and isinstance(c.type, (String, Text))}

    def apply_values(db: Session, item: Any, values: dict[str, Any]) -> None:
        if resource.prepare:
            values = resource.prepare(db, values, item if getattr(item, "id", None) else None)
        for key, value in values.items():
            setattr(item, key, "" if value is None and key in not_null_text else value)

    @router.get("", response_model=Page[read_schema], summary=f"List {resource.title}")
    def list_items(
        ctx: Admin,
        db: DbSession,
        search: Annotated[str | None, Query(max_length=100)] = None,
        visible: bool | None = None,
        page: PageNumber = 1,
        page_size: Annotated[int, Query(ge=1, le=100)] = 50,
    ):
        stmt = apply_search(select(model), resource.search_columns, search)
        if visible is not None and resource.visibility_column is not None:
            stmt = stmt.where(resource.visibility_column.is_(visible))
        items, total = paginate(db, stmt.order_by(*resource.order_by), page, page_size)
        return Page.build([serialize(db, i) for i in items], total, page, page_size)

    @router.post(
        "", response_model=read_schema, status_code=status.HTTP_201_CREATED, summary=f"Create {resource.entity_type}"
    )
    def create_item(body: write_schema, ctx: Admin, db: DbSession):  # type: ignore[valid-type]
        item = model()
        apply_values(db, item, body.model_dump())
        db.add(item)  # after the values are set, so lookups in `prepare` can't autoflush an empty row
        flush(db)
        audit.record(
            db,
            actor=ctx.user,
            action="create",
            entity_type=resource.entity_type,
            entity_id=item.id,
            label=resource.label(item),
            ip=ctx.ip,
        )
        commit(db)
        db.refresh(item)
        return serialize(db, item)

    if "display_order" in model.__table__.columns:

        @router.post("/reorder", response_model=Message, summary=f"Reorder {resource.title}")
        def reorder_items(body: ReorderRequest, ctx: Admin, db: DbSession):
            reorder(db, model, body.ids)
            audit.record(
                db,
                actor=ctx.user,
                action="reorder",
                entity_type=resource.entity_type,
                label=f"{len(body.ids)} {resource.title}",
                ip=ctx.ip,
            )
            commit(db)
            return Message(detail="Order saved.")

    @router.get("/{item_id}", response_model=read_schema, summary=f"Get {resource.entity_type}")
    def get_item(item_id: uuid.UUID, ctx: Admin, db: DbSession):
        return serialize(db, get_or_404(db, model, item_id, resource.entity_type.replace("_", " ").capitalize()))

    @router.put("/{item_id}", response_model=read_schema, summary=f"Update {resource.entity_type}")
    def update_item(item_id: uuid.UUID, body: write_schema, ctx: Admin, db: DbSession):  # type: ignore[valid-type]
        item = get_or_404(db, model, item_id, resource.entity_type.replace("_", " ").capitalize())
        apply_values(db, item, body.model_dump())
        audit.record(
            db,
            actor=ctx.user,
            action="update",
            entity_type=resource.entity_type,
            entity_id=item.id,
            label=resource.label(item),
            ip=ctx.ip,
        )
        commit(db)
        db.refresh(item)
        return serialize(db, item)

    if flags_schema is not None:

        @router.patch("/{item_id}", response_model=read_schema, summary=f"Toggle {resource.entity_type} flags")
        def patch_item(item_id: uuid.UUID, body: flags_schema, ctx: Admin, db: DbSession):  # type: ignore[valid-type]
            item = get_or_404(db, model, item_id, resource.entity_type.replace("_", " ").capitalize())
            changes = body.model_dump(exclude_none=True)
            for key, value in changes.items():
                setattr(item, key, value)
            action = "update"
            if "is_visible" in changes:
                action = "show" if changes["is_visible"] else "hide"
            audit.record(
                db,
                actor=ctx.user,
                action=action,
                entity_type=resource.entity_type,
                entity_id=item.id,
                label=resource.label(item),
                ip=ctx.ip,
            )
            commit(db)
            db.refresh(item)
            return serialize(db, item)

    @router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT, summary=f"Delete {resource.entity_type}")
    def delete_item(item_id: uuid.UUID, ctx: Admin, db: DbSession):
        item = get_or_404(db, model, item_id, resource.entity_type.replace("_", " ").capitalize())
        label = resource.label(item)
        db.delete(item)
        flush(db)
        audit.record(
            db,
            actor=ctx.user,
            action="delete",
            entity_type=resource.entity_type,
            entity_id=item_id,
            label=label,
            ip=ctx.ip,
        )
        commit(db)
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    if resource.extra_routes:
        resource.extra_routes(router)

    return router
