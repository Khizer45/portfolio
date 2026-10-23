"""Command-line tools. Run from the backend folder with the virtual environment active.

    python -m app.cli create-admin --email you@example.com --name "Your Name"
    python -m app.cli set-password --email you@example.com
    python -m app.cli list-admins
    python -m app.cli deactivate-admin --email you@example.com
    python -m app.cli revoke-sessions --email you@example.com
    python -m app.cli seed

Passwords are typed at a hidden prompt. For non-interactive environments (e.g. a
hosting shell without a TTY), set ADMIN_PASSWORD for that single command instead.
"""

import argparse
import getpass
import os
import sys

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.core.security import PASSWORD_MIN_LENGTH, hash_password, validate_password_strength
from app.db.session import get_session_factory
from app.models import (
    AdminSession,
    AdminUser,
    Article,
    Education,
    Experience,
    ProfileSettings,
    Project,
    ProjectCategory,
    Skill,
    SkillCategory,
)
from app.schemas.project import ProjectWrite
from app.services import auth as auth_service
from app.services import projects as project_service


def _read_password() -> str:
    env_password = os.environ.get("ADMIN_PASSWORD")
    if env_password:
        return env_password
    if not sys.stdin.isatty():
        sys.exit("No TTY available. Set ADMIN_PASSWORD for this command instead.")
    print(f"Choose a password of at least {PASSWORD_MIN_LENGTH} characters (a passphrase works well).")
    first = getpass.getpass("Password: ")
    second = getpass.getpass("Repeat password: ")
    if first != second:
        sys.exit("Passwords do not match.")
    return first


def _find_admin(db: Session, email: str) -> AdminUser:
    user = db.scalar(select(AdminUser).where(AdminUser.email == auth_service.normalize_email(email)))
    if user is None:
        sys.exit(f"No administrator with email {email}.")
    return user


def create_admin(db: Session, args: argparse.Namespace) -> None:
    password = _read_password()
    try:
        user = auth_service.create_admin(db, email=args.email, password=password, display_name=args.name)
    except ValueError as exc:
        sys.exit(str(exc))
    print(f"Created administrator {user.email}. Sign in at /admin/login.")


def set_password(db: Session, args: argparse.Namespace) -> None:
    user = _find_admin(db, args.email)
    password = _read_password()
    problem = validate_password_strength(password)
    if problem:
        sys.exit(problem)
    user.password_hash = hash_password(password)
    db.execute(delete(AdminSession).where(AdminSession.user_id == user.id))
    db.commit()
    print(f"Password updated for {user.email}. All existing sessions were signed out.")


def list_admins(db: Session, _: argparse.Namespace) -> None:
    users = db.scalars(select(AdminUser).order_by(AdminUser.created_at)).all()
    if not users:
        print("No administrators yet. Create one with: python -m app.cli create-admin --email ...")
    for user in users:
        state = "active" if user.is_active else "inactive"
        print(f"{user.email:40} {user.display_name:25} {state:9} last login: {user.last_login_at or 'never'}")


def deactivate_admin(db: Session, args: argparse.Namespace) -> None:
    user = _find_admin(db, args.email)
    user.is_active = False
    db.execute(delete(AdminSession).where(AdminSession.user_id == user.id))
    db.commit()
    print(f"Deactivated {user.email} and signed out all sessions.")


def revoke_sessions(db: Session, args: argparse.Namespace) -> None:
    user = _find_admin(db, args.email)
    count = db.execute(delete(AdminSession).where(AdminSession.user_id == user.id)).rowcount
    db.commit()
    print(f"Signed out {count} session(s) for {user.email}.")


def _empty(db: Session, model: type) -> bool:
    return (db.scalar(select(func.count()).select_from(model)) or 0) == 0


def seed(db: Session, _: argparse.Namespace) -> None:
    """Load the initial content. Each section is skipped if it already has data."""
    from app import seed_data as data

    done: list[str] = []

    if _empty(db, ProfileSettings):
        db.add(ProfileSettings(singleton="default", **data.PROFILE))
        done.append("profile")

    if _empty(db, ProjectCategory):
        for order, (slug, title, short, icon, description, focus) in enumerate(data.PROJECT_CATEGORIES):
            db.add(
                ProjectCategory(
                    slug=slug,
                    title=title,
                    short_title=short,
                    icon=icon,
                    description=description,
                    focus_areas=focus,
                    display_order=order * 10,
                )
            )
        done.append(f"{len(data.PROJECT_CATEGORIES)} project categories")
    db.flush()

    if _empty(db, Project):
        categories = {c.slug: c.id for c in db.scalars(select(ProjectCategory))}
        for order, item in enumerate(data.PROJECTS):
            fields = {k: v for k, v in item.items() if k not in ("category", "secondary")}
            body = ProjectWrite(
                **fields,
                category_id=categories[item["category"]],
                secondary_category_ids=[categories[s] for s in item.get("secondary", [])],
                is_published=True,
                is_featured=True,
                display_order=order * 10,
            )
            project_service.create_project(db, body)
        done.append(f"{len(data.PROJECTS)} projects")
    db.flush()

    if _empty(db, SkillCategory):
        for order, (slug, title) in enumerate(data.SKILL_CATEGORIES):
            db.add(SkillCategory(slug=slug, title=title, display_order=order * 10))
        done.append(f"{len(data.SKILL_CATEGORIES)} skill categories")
    db.flush()

    if _empty(db, Skill):
        skill_categories = {c.slug: c.id for c in db.scalars(select(SkillCategory))}
        projects = {p.slug: p.id for p in db.scalars(select(Project))}
        for order, (name, category, level, evidence, featured, learning) in enumerate(data.SKILLS):
            db.add(
                Skill(
                    name=name,
                    category_id=skill_categories[category],
                    level=level,
                    evidence_project_id=projects.get(evidence) if evidence else None,
                    is_featured=featured,
                    is_learning=learning,
                    display_order=order * 10,
                )
            )
        done.append(f"{len(data.SKILLS)} skills")

    if _empty(db, Experience):
        for item in data.EXPERIENCES:
            db.add(Experience(**item))
        done.append(f"{len(data.EXPERIENCES)} experience entries")

    if _empty(db, Education):
        for item in data.EDUCATION:
            db.add(Education(**item))
        done.append(f"{len(data.EDUCATION)} education entries")

    if _empty(db, Article):
        projects = {p.slug: p.id for p in db.scalars(select(Project))}
        for item in data.ARTICLES:
            fields = {k: v for k, v in item.items() if k != "related_project"}
            db.add(Article(**fields, related_project_id=projects.get(item.get("related_project"))))
        done.append(f"{len(data.ARTICLES)} article draft(s)")

    db.commit()
    print("Seeded: " + ", ".join(done) if done else "Nothing to seed: every section already has data.")


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="python -m app.cli", description="Portfolio administration commands.")
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("create-admin", help="Create an administrator account.")
    p.add_argument("--email", required=True)
    p.add_argument("--name", default="Admin")
    p.set_defaults(handler=create_admin)

    p = sub.add_parser("set-password", help="Reset an administrator's password.")
    p.add_argument("--email", required=True)
    p.set_defaults(handler=set_password)

    p = sub.add_parser("list-admins", help="List administrator accounts.")
    p.set_defaults(handler=list_admins)

    p = sub.add_parser("deactivate-admin", help="Disable an account and end its sessions.")
    p.add_argument("--email", required=True)
    p.set_defaults(handler=deactivate_admin)

    p = sub.add_parser("revoke-sessions", help="Sign an administrator out everywhere.")
    p.add_argument("--email", required=True)
    p.set_defaults(handler=revoke_sessions)

    p = sub.add_parser("seed", help="Load the initial portfolio content into empty tables.")
    p.set_defaults(handler=seed)

    args = parser.parse_args(argv)
    with get_session_factory()() as db:
        args.handler(db, args)


if __name__ == "__main__":
    main()
