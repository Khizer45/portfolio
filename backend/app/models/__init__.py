"""All models, imported here so Alembic and the app see the complete metadata."""

from app.models.article import Article
from app.models.auth import AdminSession, AdminUser, AuditLog, LoginAttempt
from app.models.career import Achievement, Certification, Education, Experience
from app.models.profile import ProfileSettings
from app.models.project import Project, ProjectCategory, ProjectTechnology, Technology, project_category_links
from app.models.skill import Skill, SkillCategory

__all__ = [
    "Achievement",
    "AdminSession",
    "AdminUser",
    "Article",
    "AuditLog",
    "Certification",
    "Education",
    "Experience",
    "LoginAttempt",
    "ProfileSettings",
    "Project",
    "ProjectCategory",
    "ProjectTechnology",
    "Skill",
    "SkillCategory",
    "Technology",
    "project_category_links",
]
