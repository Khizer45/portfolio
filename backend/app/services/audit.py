import uuid

from sqlalchemy.orm import Session

from app.models import AdminUser, AuditLog


def record(
    db: Session,
    *,
    actor: AdminUser | None,
    action: str,
    entity_type: str,
    entity_id: uuid.UUID | None = None,
    label: str | None = None,
    ip: str | None = None,
) -> None:
    """Add an audit entry to the current transaction (committed with the change itself)."""
    db.add(
        AuditLog(
            admin_user_id=actor.id if actor else None,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_label=(label or "")[:200] or None,
            ip_address=ip,
        )
    )
