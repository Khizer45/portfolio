import uuid
from datetime import datetime

from app.schemas.common import ReadSchema


class AuditLogRead(ReadSchema):
    id: uuid.UUID
    action: str
    entity_type: str
    entity_id: uuid.UUID | None
    entity_label: str | None
    actor: str | None
    ip_address: str | None
    created_at: datetime


class DashboardStats(ReadSchema):
    projects_published: int
    projects_draft: int
    projects_featured: int
    skills: int
    skills_hidden: int
    experiences: int
    certifications: int
    education: int
    achievements: int
    articles_published: int
    articles_draft: int
    recent_changes: list[AuditLogRead]
