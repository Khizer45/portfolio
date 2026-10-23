"""Test setup.

Tests run against a dedicated PostgreSQL database (TEST_DATABASE_URL, default
`portfolio_test`). The schema is built with the real Alembic migrations, and every
test runs inside a transaction that is rolled back afterwards.
"""

import os
from collections.abc import Iterator
from urllib.parse import urlsplit

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+psycopg://portfolio:portfolio@localhost:5432/portfolio_test"
)
_db_name = urlsplit(TEST_DATABASE_URL).path.lstrip("/")
if not _db_name.endswith("_test"):
    raise RuntimeError(f"Refusing to run tests against '{_db_name}': the test database name must end with '_test'.")

# Settings are read once and cached, so configure the environment before importing the app.
os.environ.update(
    {
        "ENVIRONMENT": "test",
        "DATABASE_URL": TEST_DATABASE_URL,
        "SECRET_KEY": "test-secret-key-that-is-long-enough-for-hmac-signing",
        "CORS_ORIGINS": "http://localhost:3000",
        "LOGIN_MAX_ATTEMPTS": "5",
        "LOG_LEVEL": "WARNING",
    }
)

import pytest  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.db.session import get_db  # noqa: E402
from app.main import create_app  # noqa: E402
from app.models import ProjectCategory, SkillCategory  # noqa: E402
from app.services import auth as auth_service  # noqa: E402

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "correct-horse-battery-staple"


def alembic_config() -> Config:
    config = Config(os.path.join(BACKEND_DIR, "alembic.ini"))
    config.set_main_option("script_location", os.path.join(BACKEND_DIR, "alembic"))
    config.set_main_option("sqlalchemy.url", TEST_DATABASE_URL)
    return config


@pytest.fixture(scope="session")
def engine():
    config = alembic_config()
    # Start from an empty schema each run; this also exercises the downgrade path.
    command.downgrade(config, "base")
    command.upgrade(config, "head")
    engine = create_engine(TEST_DATABASE_URL)
    yield engine
    engine.dispose()


@pytest.fixture
def db(engine) -> Iterator[Session]:
    connection = engine.connect()
    transaction = connection.begin()
    # Commits inside the app become savepoints; everything is rolled back after the test.
    session = Session(bind=connection, join_transaction_mode="create_savepoint", expire_on_commit=False)
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


@pytest.fixture
def app(db):
    application = create_app()

    def override_get_db():
        yield db

    application.dependency_overrides[get_db] = override_get_db
    return application


@pytest.fixture
def client(app) -> TestClient:
    return TestClient(app)


@pytest.fixture
def admin_user(db):
    return auth_service.create_admin(db, email=ADMIN_EMAIL, password=ADMIN_PASSWORD, display_name="Test Admin")


class AdminClient:
    """A TestClient that is signed in and sends the CSRF header on writes."""

    def __init__(self, client: TestClient, csrf_token: str):
        self.client = client
        self.csrf = csrf_token

    def _headers(self, extra: dict | None = None) -> dict:
        return {"X-CSRF-Token": self.csrf, **(extra or {})}

    def get(self, url: str, **kwargs):
        return self.client.get(url, **kwargs)

    def post(self, url: str, **kwargs):
        return self.client.post(url, headers=self._headers(kwargs.pop("headers", None)), **kwargs)

    def put(self, url: str, **kwargs):
        return self.client.put(url, headers=self._headers(kwargs.pop("headers", None)), **kwargs)

    def patch(self, url: str, **kwargs):
        return self.client.patch(url, headers=self._headers(kwargs.pop("headers", None)), **kwargs)

    def delete(self, url: str, **kwargs):
        return self.client.delete(url, headers=self._headers(kwargs.pop("headers", None)), **kwargs)


@pytest.fixture
def admin(client, admin_user) -> AdminClient:
    response = client.post("/api/v1/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert response.status_code == 200, response.text
    return AdminClient(client, response.json()["csrf_token"])


@pytest.fixture
def category(db) -> ProjectCategory:
    item = ProjectCategory(slug="machine-learning", title="Machine Learning", short_title="ML", icon="brain")
    db.add(item)
    db.commit()
    return item


@pytest.fixture
def other_category(db) -> ProjectCategory:
    item = ProjectCategory(slug="mlops", title="MLOps & Deployment", short_title="MLOps", icon="container")
    db.add(item)
    db.commit()
    return item


@pytest.fixture
def skill_category(db) -> SkillCategory:
    item = SkillCategory(slug="languages", title="Programming Languages")
    db.add(item)
    db.commit()
    return item


def project_payload(category_id, **overrides) -> dict:
    payload = {
        "title": "Local AI Lab",
        "summary": "Benchmarks local models on consistent tasks and hardware.",
        "category_id": str(category_id),
        "status": "in_progress",
        "technologies": ["Python", "PyTorch", "Ollama"],
        "features": [
            {"name": "Model comparison", "status": "implemented"},
            {"name": "Throughput measurements", "status": "planned"},
        ],
        "is_published": True,
    }
    payload.update(overrides)
    return payload
