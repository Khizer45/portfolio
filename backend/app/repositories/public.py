"""Read-only queries for the public site. Only published / visible content is ever returned."""

import math

from sqlalchemy import Select, and_, distinct, func, or_, select
from sqlalchemy.orm import Session

from app.models import (
    Achievement,
    Article,
    Certification,
    Education,
    Experience,
    ProfileSettings,
    Project,
    ProjectCategory,
    ProjectTechnology,
    Skill,
    SkillCategory,
    Technology,
    project_category_links,
)
from app.repositories.base import apply_search, paginate
from app.schemas.article import PublicArticle, PublicArticleSummary
from app.schemas.career import PublicExperience
from app.schemas.project import (
    ProjectImage,
    ProjectPublicDetail,
    ProjectPublicSummary,
    PublicCategory,
    PublicCategoryRef,
    RelatedArticle,
)
from app.schemas.skill import PublicProjectRef, PublicSkill, PublicSkillGroup

CONFIDENTIAL_CLIENT = "Confidential client"


def _published_projects() -> Select:
    return select(Project).where(Project.is_published.is_(True))


def _category_filter(slug: str):
    secondary = (
        select(project_category_links.c.project_id)
        .join(ProjectCategory, ProjectCategory.id == project_category_links.c.category_id)
        .where(ProjectCategory.slug == slug)
    )
    primary = select(ProjectCategory.id).where(ProjectCategory.slug == slug)
    return or_(Project.category_id.in_(primary), Project.id.in_(secondary))


def _technology_filter(name_or_slug: str):
    from app.services.slugs import technology_slug

    return Project.id.in_(
        select(ProjectTechnology.project_id).join(Technology).where(Technology.slug == technology_slug(name_or_slug))
    )


def _cover(project: Project) -> ProjectImage | None:
    images = [ProjectImage.model_validate(i) for i in project.images or []]
    return next((i for i in images if i.kind == "screenshot"), images[0] if images else None)


def _category_refs(project: Project) -> list[PublicCategoryRef]:
    cats = [project.category, *[c for c in project.secondary_categories if c.id != project.category_id]]
    return [PublicCategoryRef.model_validate(c) for c in cats]


def _summary_fields(project: Project) -> dict:
    return {
        "slug": project.slug,
        "title": project.title,
        "subtitle": project.subtitle,
        "summary": project.summary,
        "label": project.label,
        "status": project.status,
        "is_featured": project.is_featured,
        "technologies": project.technologies,
        "category": PublicCategoryRef.model_validate(project.category),
        "categories": _category_refs(project),
        "cover_image": _cover(project),
        "start_date": project.start_date,
        "end_date": project.end_date,
        "highlights": (project.results or [])[:3],
    }


def list_projects(
    db: Session,
    *,
    search: str | None,
    category: str | None,
    technology: str | None,
    status: str | None,
    featured: bool | None,
    page: int,
    page_size: int,
) -> tuple[list[ProjectPublicSummary], int]:
    stmt = _published_projects()
    if category:
        stmt = stmt.where(_category_filter(category))
    if technology:
        stmt = stmt.where(_technology_filter(technology))
    if status:
        stmt = stmt.where(Project.status == status)
    if featured is not None:
        stmt = stmt.where(Project.is_featured.is_(featured))
    if search:
        tech_match = select(ProjectTechnology.project_id).join(Technology)
        for term in search.split()[:8]:
            like = f"%{term.replace('%', '').replace('_', '')}%"
            stmt = stmt.where(
                or_(
                    Project.title.ilike(like),
                    Project.subtitle.ilike(like),
                    Project.summary.ilike(like),
                    Project.label.ilike(like),
                    Project.id.in_(tech_match.where(Technology.name.ilike(like))),
                )
            )
    stmt = stmt.order_by(Project.display_order, Project.created_at, Project.title)
    items, total = paginate(db, stmt, page, page_size)
    return [ProjectPublicSummary.model_validate(_summary_fields(p)) for p in items], total


def get_project(db: Session, slug: str) -> ProjectPublicDetail | None:
    project = db.scalar(_published_projects().where(Project.slug == slug))
    if project is None:
        return None
    articles = db.scalars(
        select(Article)
        .where(Article.related_project_id == project.id, Article.status == "published")
        .order_by(Article.published_at.desc())
    ).all()
    fields = {c.key: getattr(project, c.key) for c in Project.__table__.columns}
    return ProjectPublicDetail.model_validate(
        {
            **fields,
            **_summary_fields(project),
            "related_articles": [RelatedArticle.model_validate(a) for a in articles],
        }
    )


def list_categories(db: Session) -> list[PublicCategory]:
    published = Project.is_published.is_(True)
    primary_counts = dict(
        db.execute(select(Project.category_id, func.count()).where(published).group_by(Project.category_id)).all()
    )
    secondary_counts = dict(
        db.execute(
            select(project_category_links.c.category_id, func.count(distinct(Project.id)))
            .join(Project, and_(Project.id == project_category_links.c.project_id, published))
            .where(project_category_links.c.category_id != Project.category_id)
            .group_by(project_category_links.c.category_id)
        ).all()
    )
    categories = db.scalars(select(ProjectCategory).order_by(ProjectCategory.display_order, ProjectCategory.title))
    return [
        PublicCategory.model_validate(
            {
                **{k: getattr(c, k) for k in ("slug", "title", "short_title", "description", "focus_areas", "icon")},
                "project_count": primary_counts.get(c.id, 0) + secondary_counts.get(c.id, 0),
            }
        )
        for c in categories
    ]


def list_technologies(db: Session) -> list[dict]:
    rows = db.execute(
        select(Technology.name, Technology.slug, func.count(ProjectTechnology.project_id))
        .join(ProjectTechnology)
        .join(Project, and_(Project.id == ProjectTechnology.project_id, Project.is_published.is_(True)))
        .group_by(Technology.id)
        .order_by(func.lower(Technology.name))
    ).all()
    return [{"name": name, "slug": slug, "project_count": count} for name, slug, count in rows]


def list_skill_groups(db: Session) -> list[PublicSkillGroup]:
    skills = db.scalars(
        select(Skill)
        .join(SkillCategory)
        .where(Skill.is_visible.is_(True))
        .order_by(SkillCategory.display_order, SkillCategory.title, Skill.display_order, Skill.name)
    ).all()
    groups: dict = {}
    for skill in skills:
        group = groups.setdefault(
            skill.category_id,
            {
                "slug": skill.category.slug,
                "title": skill.category.title,
                "description": skill.category.description,
                "skills": [],
            },
        )
        evidence = skill.evidence_project
        group["skills"].append(
            PublicSkill(
                name=skill.name,
                level=skill.level,
                description=skill.description,
                is_learning=skill.is_learning,
                is_featured=skill.is_featured,
                # Never link to a project the public can't see.
                evidence_project=PublicProjectRef.model_validate(evidence)
                if evidence and evidence.is_published
                else None,
            )
        )
    return [PublicSkillGroup.model_validate(g) for g in groups.values()]


def list_experiences(db: Session) -> list[PublicExperience]:
    rows = db.scalars(
        select(Experience)
        .where(Experience.is_visible.is_(True))
        .order_by(
            Experience.display_order,
            Experience.is_current.desc(),
            func.coalesce(Experience.end_date, "9999").desc(),
            Experience.start_date.desc(),
        )
    ).all()
    result = []
    for exp in rows:
        item = PublicExperience.model_validate(exp)
        if exp.is_confidential:
            # The link usually points at the client too (website, case study).
            item.organization, item.organization_url = CONFIDENTIAL_CLIENT, None
            item.link_url = item.link_label = None
        result.append(item)
    return result


def list_certifications(db: Session) -> list[Certification]:
    return list(
        db.scalars(
            select(Certification)
            .where(Certification.is_visible.is_(True))
            .order_by(Certification.display_order, Certification.issue_date.desc())
        )
    )


def list_education(db: Session) -> list[Education]:
    return list(
        db.scalars(
            select(Education)
            .where(Education.is_visible.is_(True))
            .order_by(Education.is_primary.desc(), Education.display_order, Education.start_date.desc())
        )
    )


def list_achievements(db: Session) -> list[Achievement]:
    return list(
        db.scalars(
            select(Achievement)
            .where(Achievement.is_visible.is_(True))
            .order_by(Achievement.display_order, Achievement.date.desc())
        )
    )


def _reading_minutes(content: str) -> int:
    return max(1, math.ceil(len(content.split()) / 200))


def _article_fields(article: Article) -> dict:
    project = article.related_project
    return {
        "slug": article.slug,
        "title": article.title,
        "summary": article.summary,
        "tags": article.tags,
        "external_url": article.external_url,
        "related_project": PublicProjectRef.model_validate(project) if project and project.is_published else None,
        "published_at": article.published_at,
        "updated_at": article.updated_at,
        "reading_minutes": _reading_minutes(article.content),
    }


def list_articles(db: Session, *, tag: str | None, search: str | None, page: int, page_size: int):
    stmt = select(Article).where(Article.status == "published")
    if tag:
        stmt = stmt.where(Article.tags.any(tag))
    stmt = apply_search(stmt, [Article.title, Article.summary], search)
    stmt = stmt.order_by(Article.published_at.desc().nulls_last(), Article.created_at.desc())
    items, total = paginate(db, stmt, page, page_size)
    return [PublicArticleSummary.model_validate(_article_fields(a)) for a in items], total


def get_article(db: Session, slug: str) -> PublicArticle | None:
    article = db.scalar(select(Article).where(Article.slug == slug, Article.status == "published"))
    if article is None:
        return None
    return PublicArticle.model_validate({**_article_fields(article), "content": article.content})


def get_profile(db: Session) -> ProfileSettings | None:
    return db.scalar(select(ProfileSettings))
