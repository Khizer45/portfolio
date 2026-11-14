import uuid
from typing import Annotated

from fastapi import APIRouter, Query, Response, status
from sqlalchemy import select

from app.api.deps import Admin, DbSession, PageNumber
from app.models import Project, ProjectCategory
from app.models.enums import ProjectStatus
from app.repositories.base import apply_search, commit, flush, get_or_404, paginate, reorder
from app.schemas.common import Message, Page, ReorderRequest
from app.schemas.project import (
    GithubImportRequest,
    GithubImportResult,
    GithubRepoRead,
    ProjectAdminListItem,
    ProjectAdminRead,
    ProjectFlagsUpdate,
    ProjectWrite,
)
from app.services import audit
from app.services import github_import as github
from app.services import projects as service

router = APIRouter(prefix="/projects", tags=["admin: projects"])


@router.get("", response_model=Page[ProjectAdminListItem])
def list_projects(
    ctx: Admin,
    db: DbSession,
    search: Annotated[str | None, Query(max_length=100)] = None,
    published: bool | None = None,
    project_status: Annotated[ProjectStatus | None, Query(alias="status")] = None,
    category_id: uuid.UUID | None = None,
    page: PageNumber = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 50,
):
    """All projects, including drafts."""
    stmt = apply_search(select(Project), [Project.title, Project.subtitle, Project.summary, Project.slug], search)
    if published is not None:
        stmt = stmt.where(Project.is_published.is_(published))
    if project_status:
        stmt = stmt.where(Project.status == project_status)
    if category_id:
        stmt = stmt.where(Project.category_id == category_id)
    items, total = paginate(
        db, stmt.order_by(Project.display_order, Project.created_at, Project.title), page, page_size
    )
    return Page.build([ProjectAdminListItem.model_validate(p) for p in items], total, page, page_size)


@router.post("", response_model=ProjectAdminRead, status_code=status.HTTP_201_CREATED)
def create_project(body: ProjectWrite, ctx: Admin, db: DbSession):
    project = service.create_project(db, body)
    flush(db)
    audit.record(
        db, actor=ctx.user, action="create", entity_type="project", entity_id=project.id, label=project.title, ip=ctx.ip
    )
    commit(db)
    db.refresh(project)
    return service.to_admin_read(project)


def _imported_urls(db) -> set[str]:
    return {
        url.lower().rstrip("/") for url in db.scalars(select(Project.github_url).where(Project.github_url.is_not(None)))
    }


@router.get("/github-repos", response_model=list[GithubRepoRead])
def list_github_repos(ctx: Admin, db: DbSession, username: Annotated[str, Query(max_length=39)]):
    """The user's public GitHub repositories, marking the ones already imported."""
    imported = _imported_urls(db)
    return [
        GithubRepoRead(
            name=repo.name,
            description=repo.description,
            html_url=repo.html_url,
            homepage=repo.homepage,
            language=repo.language,
            topics=repo.topics,
            stars=repo.stars,
            fork=repo.fork,
            archived=repo.archived,
            pushed_at=repo.pushed_at,
            already_imported=repo.html_url.lower().rstrip("/") in imported,
        )
        for repo in github.list_repos(username)
    ]


@router.post("/import-github", response_model=GithubImportResult, status_code=status.HTTP_201_CREATED)
def import_github_repos(body: GithubImportRequest, ctx: Admin, db: DbSession):
    """Create one draft project per chosen repository, from its GitHub details and README."""
    get_or_404(db, ProjectCategory, body.category_id, "Project category")
    wanted = {name.lower() for name in body.repos}
    repos = [repo for repo in github.list_repos(body.username) if repo.name.lower() in wanted]
    imported = _imported_urls(db)
    created: list[str] = []
    skipped = sorted(wanted - {repo.name.lower() for repo in repos})
    for repo in repos:
        if repo.html_url.lower().rstrip("/") in imported:
            skipped.append(repo.name)
            continue
        summary = repo.description or github.readme_summary(repo.full_name)
        homepage = repo.homepage if repo.homepage and repo.homepage.startswith(("https://", "http://")) else None
        data = ProjectWrite(
            title=github.project_title(repo.name)[:120],
            summary=(summary or "Imported from GitHub. Add a short summary before publishing.")[:400],
            category_id=body.category_id,
            status=body.status,
            start_date=repo.created_at[:7] or None,
            technologies=github.technologies(repo),
            github_url=repo.html_url,
            demo_url=homepage,
            is_published=False,
        )
        project = service.create_project(db, data)
        flush(db)
        audit.record(
            db,
            actor=ctx.user,
            action="create",
            entity_type="project",
            entity_id=project.id,
            label=f"{project.title} (from GitHub)",
            ip=ctx.ip,
        )
        created.append(project.title)
    commit(db)
    return GithubImportResult(created=created, skipped=skipped)


@router.post("/reorder", response_model=Message)
def reorder_projects(body: ReorderRequest, ctx: Admin, db: DbSession):
    reorder(db, Project, body.ids)
    audit.record(
        db, actor=ctx.user, action="reorder", entity_type="project", label=f"{len(body.ids)} projects", ip=ctx.ip
    )
    commit(db)
    return Message(detail="Order saved.")


@router.get("/{project_id}", response_model=ProjectAdminRead)
def get_project(project_id: uuid.UUID, ctx: Admin, db: DbSession):
    return service.to_admin_read(get_or_404(db, Project, project_id, "Project"))


@router.put("/{project_id}", response_model=ProjectAdminRead)
def update_project(project_id: uuid.UUID, body: ProjectWrite, ctx: Admin, db: DbSession):
    project = get_or_404(db, Project, project_id, "Project")
    service.update_project(db, project, body)
    audit.record(
        db, actor=ctx.user, action="update", entity_type="project", entity_id=project.id, label=project.title, ip=ctx.ip
    )
    commit(db)
    db.refresh(project)
    return service.to_admin_read(project)


@router.patch("/{project_id}", response_model=ProjectAdminRead)
def patch_project(project_id: uuid.UUID, body: ProjectFlagsUpdate, ctx: Admin, db: DbSession):
    """Publish/unpublish, feature/unfeature, or change display order."""
    project = get_or_404(db, Project, project_id, "Project")
    action = "update"
    if body.is_published is not None:
        service.set_published(project, body.is_published)
        action = "publish" if body.is_published else "unpublish"
    if body.is_featured is not None:
        project.is_featured = body.is_featured
        action = action if body.is_published is not None else ("feature" if body.is_featured else "unfeature")
    if body.display_order is not None:
        project.display_order = body.display_order
    audit.record(
        db, actor=ctx.user, action=action, entity_type="project", entity_id=project.id, label=project.title, ip=ctx.ip
    )
    commit(db)
    db.refresh(project)
    return service.to_admin_read(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project_id: uuid.UUID, ctx: Admin, db: DbSession):
    """Delete a project. Skills and articles that referenced it keep existing, without the link."""
    project = get_or_404(db, Project, project_id, "Project")
    title = project.title
    db.delete(project)
    flush(db)
    service.delete_unused_technologies(db)
    audit.record(
        db, actor=ctx.user, action="delete", entity_type="project", entity_id=project_id, label=title, ip=ctx.ip
    )
    commit(db)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
