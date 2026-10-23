"""Admin CRUD routers for every resource that fits the standard pattern."""

import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.api.deps import Admin, DbSession
from app.api.v1.admin.crud import CrudResource, build_crud_router
from app.core.errors import FieldValidationError
from app.models import (
    Achievement,
    Article,
    Certification,
    Education,
    Experience,
    Project,
    ProjectCategory,
    Skill,
    SkillCategory,
    project_category_links,
)
from app.repositories.base import commit, ensure_exists, get_or_404
from app.schemas.article import ArticleAdminRead, ArticleStatusUpdate, ArticleWrite
from app.schemas.career import (
    AchievementRead,
    AchievementWrite,
    CertificationRead,
    CertificationWrite,
    EducationRead,
    EducationWrite,
    ExperienceRead,
    ExperienceWrite,
    VisibilityUpdate,
)
from app.schemas.project import OrderUpdate, ProjectCategoryRead, ProjectCategoryWrite
from app.schemas.skill import SkillCategoryRead, SkillCategoryWrite, SkillFlagsUpdate, SkillRead, SkillWrite
from app.services import audit
from app.services.slugs import resolve_slug


def _with_slug(model: type):
    def prepare(db: Session, values: dict[str, Any], existing: Any | None) -> dict[str, Any]:
        values["slug"] = resolve_slug(
            db,
            model,
            values.get("slug"),
            values["title"],
            existing.slug if existing else None,
            existing.id if existing else None,
        )
        return values

    return prepare


# --------------------------------------------------------------------------- #
# Project categories
# --------------------------------------------------------------------------- #


def _project_category_counts(db: Session) -> dict:
    primary = dict(db.execute(select(Project.category_id, func.count()).group_by(Project.category_id)).all())
    secondary = dict(
        db.execute(
            select(project_category_links.c.category_id, func.count()).group_by(project_category_links.c.category_id)
        ).all()
    )
    return {key: primary.get(key, 0) + secondary.get(key, 0) for key in {*primary, *secondary}}


def _serialize_project_category(db: Session, item: ProjectCategory) -> ProjectCategoryRead:
    data = ProjectCategoryRead.model_validate(item)
    data.project_count = _project_category_counts(db).get(item.id, 0)
    return data


project_categories = CrudResource(
    name="project-categories",
    entity_type="project_category",
    title="project categories",
    model=ProjectCategory,
    write_schema=ProjectCategoryWrite,
    read_schema=ProjectCategoryRead,
    flags_schema=OrderUpdate,
    label=lambda c: c.title,
    search_columns=[ProjectCategory.title, ProjectCategory.slug],
    order_by=[ProjectCategory.display_order, ProjectCategory.title],
    prepare=_with_slug(ProjectCategory),
    serialize=_serialize_project_category,
)

# --------------------------------------------------------------------------- #
# Skills
# --------------------------------------------------------------------------- #


def _serialize_skill_category(db: Session, item: SkillCategory) -> SkillCategoryRead:
    data = SkillCategoryRead.model_validate(item)
    data.skill_count = db.scalar(select(func.count()).where(Skill.category_id == item.id)) or 0
    return data


skill_categories = CrudResource(
    name="skill-categories",
    entity_type="skill_category",
    title="skill categories",
    model=SkillCategory,
    write_schema=SkillCategoryWrite,
    read_schema=SkillCategoryRead,
    flags_schema=OrderUpdate,
    label=lambda c: c.title,
    search_columns=[SkillCategory.title, SkillCategory.slug],
    order_by=[SkillCategory.display_order, SkillCategory.title],
    prepare=_with_slug(SkillCategory),
    serialize=_serialize_skill_category,
)


def _prepare_skill(db: Session, values: dict[str, Any], existing: Any | None) -> dict[str, Any]:
    ensure_exists(db, SkillCategory, values["category_id"], "category_id", "Skill category")
    ensure_exists(db, Project, values.get("evidence_project_id"), "evidence_project_id", "Project")
    return values


skills = CrudResource(
    name="skills",
    entity_type="skill",
    title="skills",
    model=Skill,
    write_schema=SkillWrite,
    read_schema=SkillRead,
    flags_schema=SkillFlagsUpdate,
    visibility_column=Skill.is_visible,
    label=lambda s: s.name,
    search_columns=[Skill.name],
    order_by=[Skill.display_order, Skill.name],
    prepare=_prepare_skill,
)

# --------------------------------------------------------------------------- #
# Experience, certifications, education, achievements
# --------------------------------------------------------------------------- #

experiences = CrudResource(
    name="experiences",
    entity_type="experience",
    title="experience entries",
    model=Experience,
    write_schema=ExperienceWrite,
    read_schema=ExperienceRead,
    flags_schema=VisibilityUpdate,
    visibility_column=Experience.is_visible,
    label=lambda e: f"{e.role} — {e.organization}",
    search_columns=[Experience.organization, Experience.role, Experience.location],
    order_by=[Experience.display_order, Experience.is_current.desc(), Experience.start_date.desc()],
)

certifications = CrudResource(
    name="certifications",
    entity_type="certification",
    title="certifications",
    model=Certification,
    write_schema=CertificationWrite,
    read_schema=CertificationRead,
    flags_schema=VisibilityUpdate,
    visibility_column=Certification.is_visible,
    label=lambda c: c.name,
    search_columns=[Certification.name, Certification.issuer],
    order_by=[Certification.display_order, Certification.issue_date.desc()],
)


def _prepare_education(db: Session, values: dict[str, Any], existing: Any | None) -> dict[str, Any]:
    if values.get("is_primary"):
        # Only one entry can be primary: making this one primary demotes the others.
        stmt = update(Education).where(Education.is_primary.is_(True))
        if existing is not None:
            stmt = stmt.where(Education.id != existing.id)
        db.execute(stmt.values(is_primary=False))
    return values


education = CrudResource(
    name="education",
    entity_type="education",
    title="education entries",
    model=Education,
    write_schema=EducationWrite,
    read_schema=EducationRead,
    flags_schema=VisibilityUpdate,
    visibility_column=Education.is_visible,
    label=lambda e: f"{e.qualification} — {e.institution}",
    search_columns=[Education.institution, Education.qualification],
    order_by=[Education.display_order, Education.start_date.desc()],
    prepare=_prepare_education,
)

achievements = CrudResource(
    name="achievements",
    entity_type="achievement",
    title="achievements",
    model=Achievement,
    write_schema=AchievementWrite,
    read_schema=AchievementRead,
    flags_schema=VisibilityUpdate,
    visibility_column=Achievement.is_visible,
    label=lambda a: a.title,
    search_columns=[Achievement.title, Achievement.issuer],
    order_by=[Achievement.display_order, Achievement.date.desc()],
)

# --------------------------------------------------------------------------- #
# Articles
# --------------------------------------------------------------------------- #


def _prepare_article(db: Session, values: dict[str, Any], existing: Any | None) -> dict[str, Any]:
    ensure_exists(db, Project, values.get("related_project_id"), "related_project_id", "Project")
    values = _with_slug(Article)(db, values, existing)
    if values["status"] == "published" and (existing is None or existing.published_at is None):
        values["published_at"] = datetime.now(UTC)
    return values


def _article_status_routes(router: APIRouter) -> None:
    @router.patch("/{item_id}", response_model=ArticleAdminRead, summary="Publish or unpublish an article")
    def set_status(item_id: uuid.UUID, body: ArticleStatusUpdate, ctx: Admin, db: DbSession):
        article = get_or_404(db, Article, item_id, "Article")
        if body.status == "published" and not article.content.strip() and not article.external_url:
            raise FieldValidationError("status", "Add content or an external URL before publishing.")
        article.status = body.status
        if body.status == "published" and article.published_at is None:
            article.published_at = datetime.now(UTC)
        audit.record(
            db,
            actor=ctx.user,
            action="publish" if body.status == "published" else "unpublish",
            entity_type="article",
            entity_id=article.id,
            label=article.title,
            ip=ctx.ip,
        )
        commit(db)
        db.refresh(article)
        return ArticleAdminRead.model_validate(article)


articles = CrudResource(
    name="articles",
    entity_type="article",
    title="articles",
    model=Article,
    write_schema=ArticleWrite,
    read_schema=ArticleAdminRead,
    label=lambda a: a.title,
    search_columns=[Article.title, Article.summary],
    order_by=[Article.updated_at.desc()],
    prepare=_prepare_article,
    extra_routes=_article_status_routes,
)

ROUTERS = [
    build_crud_router(resource)
    for resource in (
        project_categories,
        skill_categories,
        skills,
        experiences,
        certifications,
        education,
        achievements,
        articles,
    )
]
