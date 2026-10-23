"""Admin: dashboard, profile settings, technologies, and the activity log."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Query, Response, status
from sqlalchemy import func, select

from app.api.deps import Admin, DbSession, PageNumber
from app.core.errors import ConflictError
from app.models import (
    Achievement,
    Article,
    AuditLog,
    Certification,
    Education,
    Experience,
    ProfileSettings,
    Project,
    ProjectTechnology,
    Skill,
    Technology,
)
from app.repositories.base import commit, get_or_404, paginate
from app.schemas.admin import AuditLogRead, DashboardStats
from app.schemas.common import Page
from app.schemas.profile import ProfileRead, ProfileWrite
from app.schemas.project import TechnologyRead, TechnologyUpdate
from app.services import audit
from app.services.projects import delete_unused_technologies
from app.services.slugs import technology_slug

router = APIRouter()


def _audit_read(entry: AuditLog) -> AuditLogRead:
    return AuditLogRead(
        id=entry.id,
        action=entry.action,
        entity_type=entry.entity_type,
        entity_id=entry.entity_id,
        entity_label=entry.entity_label,
        actor=entry.admin_user.display_name if entry.admin_user else None,
        ip_address=entry.ip_address,
        created_at=entry.created_at,
    )


@router.get("/stats", response_model=DashboardStats, tags=["admin: dashboard"])
def dashboard_stats(ctx: Admin, db: DbSession):
    """Counts for the dashboard, computed from the database on every request."""

    def count(model, *where) -> int:
        return db.scalar(select(func.count()).select_from(model).where(*where)) or 0

    recent = db.scalars(
        select(AuditLog).where(AuditLog.entity_type != "session").order_by(AuditLog.created_at.desc()).limit(10)
    ).all()
    return DashboardStats(
        projects_published=count(Project, Project.is_published.is_(True)),
        projects_draft=count(Project, Project.is_published.is_(False)),
        projects_featured=count(Project, Project.is_featured.is_(True), Project.is_published.is_(True)),
        skills=count(Skill),
        skills_hidden=count(Skill, Skill.is_visible.is_(False)),
        experiences=count(Experience),
        certifications=count(Certification),
        education=count(Education),
        achievements=count(Achievement),
        articles_published=count(Article, Article.status == "published"),
        articles_draft=count(Article, Article.status == "draft"),
        recent_changes=[_audit_read(e) for e in recent],
    )


@router.get("/audit-logs", response_model=Page[AuditLogRead], tags=["admin: dashboard"])
def list_audit_logs(
    ctx: Admin,
    db: DbSession,
    entity_type: Annotated[str | None, Query(max_length=40)] = None,
    page: PageNumber = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 50,
):
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc())
    if entity_type:
        stmt = stmt.where(AuditLog.entity_type == entity_type)
    items, total = paginate(db, stmt, page, page_size)
    return Page.build([_audit_read(e) for e in items], total, page, page_size)


# --------------------------------------------------------------------------- #
# Profile
# --------------------------------------------------------------------------- #

_PROFILE_TEXT_FIELDS = {"role", "intro", "biography", "location", "availability_label"}


@router.get("/profile", response_model=ProfileRead | None, tags=["admin: profile"])
def get_profile(ctx: Admin, db: DbSession):
    """The profile, or null if it has never been saved."""
    return db.scalar(select(ProfileSettings))


@router.put("/profile", response_model=ProfileRead, tags=["admin: profile"])
def update_profile(body: ProfileWrite, ctx: Admin, db: DbSession):
    profile = db.scalar(select(ProfileSettings))
    if profile is None:
        profile = ProfileSettings(singleton="default")
        db.add(profile)
    for key, value in body.model_dump().items():
        setattr(profile, key, "" if value is None and key in _PROFILE_TEXT_FIELDS else value)
    audit.record(db, actor=ctx.user, action="update", entity_type="profile", label=body.display_name, ip=ctx.ip)
    commit(db)
    db.refresh(profile)
    return profile


# --------------------------------------------------------------------------- #
# Technologies (created automatically from project forms)
# --------------------------------------------------------------------------- #


@router.get("/technologies", response_model=list[TechnologyRead], tags=["admin: technologies"])
def list_technologies(ctx: Admin, db: DbSession):
    rows = db.execute(
        select(Technology, func.count(ProjectTechnology.project_id))
        .outerjoin(ProjectTechnology)
        .group_by(Technology.id)
        .order_by(func.lower(Technology.name))
    ).all()
    return [TechnologyRead(id=t.id, name=t.name, slug=t.slug, project_count=count) for t, count in rows]


@router.put("/technologies/{technology_id}", response_model=TechnologyRead, tags=["admin: technologies"])
def rename_technology(technology_id: uuid.UUID, body: TechnologyUpdate, ctx: Admin, db: DbSession):
    """Rename a technology everywhere it is used (e.g. fix 'Pytorch' → 'PyTorch')."""
    tech = get_or_404(db, Technology, technology_id, "Technology")
    new_slug = technology_slug(body.name)
    clash = db.scalar(select(Technology).where(Technology.slug == new_slug, Technology.id != tech.id))
    if clash:
        raise ConflictError("Conflict", errors=[{"field": "name", "message": f"'{clash.name}' already exists."}])
    old_name = tech.name
    tech.name, tech.slug = body.name, new_slug
    audit.record(
        db,
        actor=ctx.user,
        action="update",
        entity_type="technology",
        entity_id=tech.id,
        label=f"{old_name} → {body.name}",
        ip=ctx.ip,
    )
    commit(db)
    count = db.scalar(select(func.count()).where(ProjectTechnology.technology_id == tech.id)) or 0
    return TechnologyRead(id=tech.id, name=tech.name, slug=tech.slug, project_count=count)


@router.delete("/technologies/unused", response_model=dict, tags=["admin: technologies"])
def delete_unused(ctx: Admin, db: DbSession):
    removed = delete_unused_technologies(db)
    if removed:
        audit.record(
            db, actor=ctx.user, action="delete", entity_type="technology", label=f"{removed} unused", ip=ctx.ip
        )
    commit(db)
    return {"removed": removed}


@router.delete("/technologies/{technology_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["admin: technologies"])
def delete_technology(technology_id: uuid.UUID, ctx: Admin, db: DbSession):
    """Delete a technology and remove it from every project that uses it."""
    tech = get_or_404(db, Technology, technology_id, "Technology")
    name = tech.name
    db.delete(tech)
    audit.record(
        db, actor=ctx.user, action="delete", entity_type="technology", entity_id=technology_id, label=name, ip=ctx.ip
    )
    commit(db)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
