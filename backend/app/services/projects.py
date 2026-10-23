"""Create and update projects, including their technologies and extra categories."""

from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import FieldValidationError
from app.models import Project, ProjectCategory, ProjectTechnology, Technology
from app.schemas.project import ProjectAdminRead, ProjectWrite
from app.services.slugs import resolve_slug, technology_slug

# Fields copied straight from the request body onto the model.
_SIMPLE_FIELDS = [
    "title",
    "subtitle",
    "summary",
    "description",
    "category_id",
    "subcategory",
    "status",
    "label",
    "role",
    "start_date",
    "end_date",
    "problem",
    "architecture",
    "contribution",
    "implementation",
    "challenges",
    "lessons",
    "next_steps",
    "evaluation_note",
    "notice_title",
    "notice_body",
    "github_url",
    "demo_url",
    "docs_url",
    "video_url",
    "is_featured",
    "is_published",
    "display_order",
]
_JSON_FIELDS = ["features", "decisions", "results", "images"]


def _sync_technologies(db: Session, project: Project, names: list[str]) -> None:
    """Point the project at these technologies, in this order, creating any new ones."""
    wanted = [(name, technology_slug(name)) for name in names]
    by_slug = {
        tech.slug: tech
        for tech in db.scalars(select(Technology).where(Technology.slug.in_([slug for _, slug in wanted])))
    }
    # Technologies added earlier in this transaction but not yet flushed (e.g. bulk seeding).
    by_slug.update({obj.slug: obj for obj in db.new if isinstance(obj, Technology)})
    current = {link.technology.slug: link for link in project.technology_links}
    links: list[ProjectTechnology] = []
    for position, (name, slug) in enumerate(wanted):
        link = current.get(slug)
        if link is None:
            tech = by_slug.get(slug)
            if tech is None:
                tech = Technology(name=name, slug=slug)
                db.add(tech)
                by_slug[slug] = tech
            link = ProjectTechnology(technology=tech)
        link.position = position
        links.append(link)
    # Links not in `links` are deleted (delete-orphan cascade).
    project.technology_links = links


def _apply(db: Session, project: Project, data: ProjectWrite) -> None:
    if db.get(ProjectCategory, data.category_id) is None:
        raise FieldValidationError("category_id", "Category not found.")
    secondary = list(db.scalars(select(ProjectCategory).where(ProjectCategory.id.in_(data.secondary_category_ids))))
    if len(secondary) != len(data.secondary_category_ids):
        raise FieldValidationError("secondary_category_ids", "One or more categories were not found.")

    values = data.model_dump()
    for field in _SIMPLE_FIELDS:
        setattr(project, field, values[field])
    for field in _JSON_FIELDS:
        setattr(project, field, values[field])
    project.slug = resolve_slug(db, Project, data.slug, data.title, project.slug, project.id)
    project.secondary_categories = secondary
    if project.is_published and project.published_at is None:
        project.published_at = datetime.now(UTC)
    _sync_technologies(db, project, data.technologies)


def create_project(db: Session, data: ProjectWrite) -> Project:
    project = Project()
    # Fill in every field before adding to the session, so validation queries can't
    # autoflush a half-built row.
    _apply(db, project, data)
    db.add(project)
    return project


def update_project(db: Session, project: Project, data: ProjectWrite) -> Project:
    _apply(db, project, data)
    return project


def set_published(project: Project, published: bool) -> None:
    project.is_published = published
    if published and project.published_at is None:
        project.published_at = datetime.now(UTC)


def to_admin_read(project: Project) -> ProjectAdminRead:
    return ProjectAdminRead.model_validate(
        {
            **{c.key: getattr(project, c.key) for c in Project.__table__.columns},
            "category": project.category,
            "secondary_category_ids": [c.id for c in project.secondary_categories],
            "technologies": project.technologies,
        }
    )


def delete_unused_technologies(db: Session) -> int:
    unused = (
        select(Technology.id)
        .outerjoin(ProjectTechnology)
        .group_by(Technology.id)
        .having(func.count(ProjectTechnology.project_id) == 0)
    )
    ids = list(db.scalars(unused))
    for tech_id in ids:
        db.delete(db.get(Technology, tech_id))
    return len(ids)
