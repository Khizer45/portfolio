"""Public, read-only endpoints. Only published and visible content is returned."""

from typing import Annotated

from fastapi import APIRouter, Query

from app.api.deps import DbSession, PageNumber
from app.core.errors import NotFoundError
from app.models.enums import ProjectStatus
from app.repositories import public as repo
from app.schemas.article import PublicArticle, PublicArticleSummary
from app.schemas.career import PublicAchievement, PublicCertification, PublicEducation, PublicExperience
from app.schemas.common import Page
from app.schemas.profile import ProfileRead
from app.schemas.project import ProjectPublicDetail, ProjectPublicSummary, PublicCategory
from app.schemas.skill import PublicSkillGroup

router = APIRouter(tags=["public"])

SearchText = Annotated[str | None, Query(max_length=100)]


@router.get("/profile", response_model=ProfileRead)
def get_profile(db: DbSession):
    profile = repo.get_profile(db)
    if profile is None:
        raise NotFoundError("Profile has not been set up yet.")
    return profile


@router.get("/projects", response_model=Page[ProjectPublicSummary])
def list_projects(
    db: DbSession,
    search: SearchText = None,
    category: Annotated[str | None, Query(max_length=80, description="Category slug")] = None,
    technology: Annotated[str | None, Query(max_length=60, description="Technology name or slug")] = None,
    status: ProjectStatus | None = None,
    featured: bool | None = None,
    page: PageNumber = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 50,
):
    items, total = repo.list_projects(
        db,
        search=search,
        category=category,
        technology=technology,
        status=status,
        featured=featured,
        page=page,
        page_size=page_size,
    )
    return Page.build(items, total, page, page_size)


@router.get("/projects/{slug}", response_model=ProjectPublicDetail, responses={404: {"description": "Not found"}})
def get_project(slug: str, db: DbSession):
    project = repo.get_project(db, slug)
    if project is None:
        raise NotFoundError("Project not found.")
    return project


@router.get("/project-categories", response_model=list[PublicCategory])
def list_project_categories(db: DbSession):
    """All categories, with the number of published projects in each (0 = "coming soon")."""
    return repo.list_categories(db)


@router.get("/technologies")
def list_technologies(db: DbSession) -> list[dict]:
    """Technologies used by published projects, for filters."""
    return repo.list_technologies(db)


@router.get("/skills", response_model=list[PublicSkillGroup])
def list_skills(db: DbSession):
    """Visible skills grouped by category, in display order."""
    return repo.list_skill_groups(db)


@router.get("/experiences", response_model=list[PublicExperience])
def list_experiences(db: DbSession):
    return repo.list_experiences(db)


@router.get("/certifications", response_model=list[PublicCertification])
def list_certifications(db: DbSession):
    return repo.list_certifications(db)


@router.get("/education", response_model=list[PublicEducation])
def list_education(db: DbSession):
    return repo.list_education(db)


@router.get("/achievements", response_model=list[PublicAchievement])
def list_achievements(db: DbSession):
    """Awards, scholarships, competitions, and publications."""
    return repo.list_achievements(db)


@router.get("/articles", response_model=Page[PublicArticleSummary])
def list_articles(
    db: DbSession,
    tag: Annotated[str | None, Query(max_length=60)] = None,
    search: SearchText = None,
    page: PageNumber = 1,
    page_size: Annotated[int, Query(ge=1, le=50)] = 20,
):
    items, total = repo.list_articles(db, tag=tag, search=search, page=page, page_size=page_size)
    return Page.build(items, total, page, page_size)


@router.get("/articles/{slug}", response_model=PublicArticle, responses={404: {"description": "Not found"}})
def get_article(slug: str, db: DbSession):
    article = repo.get_article(db, slug)
    if article is None:
        raise NotFoundError("Article not found.")
    return article
