import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import delete, func, select, update
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.main import create_app
from app.models import AdminSession, AdminUser, AuditLog, LoginAttempt
from app.services import auth as auth_service
from app.tests.conftest import ADMIN_EMAIL, ADMIN_PASSWORD

LOGIN = "/api/v1/auth/login"


def test_login_success_sets_secure_session_cookie(client, admin_user):
    response = client.post(LOGIN, json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert response.status_code == 200
    body = response.json()
    assert body["user"]["email"] == ADMIN_EMAIL
    assert len(body["csrf_token"]) == 64
    cookie = response.headers["set-cookie"]
    assert get_settings().session_cookie_name in cookie
    assert "HttpOnly" in cookie
    assert "SameSite=lax" in cookie
    assert response.headers["cache-control"] == "no-store"


def test_login_is_case_insensitive_for_email(client, admin_user):
    response = client.post(LOGIN, json={"email": "ADMIN@Example.com", "password": ADMIN_PASSWORD})
    assert response.status_code == 200


def test_wrong_password_and_unknown_email_get_the_same_generic_error(client, admin_user):
    wrong = client.post(LOGIN, json={"email": ADMIN_EMAIL, "password": "not-the-password"})
    unknown = client.post(LOGIN, json={"email": "nobody@example.com", "password": "whatever-password"})
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json() == {"detail": "Invalid email or password."}
    assert "set-cookie" not in wrong.headers


def test_login_validates_input(client):
    response = client.post(LOGIN, json={"email": "not-an-email", "password": ""})
    assert response.status_code == 422
    fields = {e["field"] for e in response.json()["errors"]}
    assert {"email", "password"} <= fields
    # Problems that concern no particular field have field null.
    malformed = client.post(LOGIN, content=b"{not json", headers={"content-type": "application/json"})
    assert malformed.json()["errors"] == [{"field": None, "message": "JSON decode error"}]


def test_login_is_rate_limited_after_repeated_failures(client, admin_user):
    for _ in range(5):
        assert client.post(LOGIN, json={"email": ADMIN_EMAIL, "password": "wrong-password"}).status_code == 401
    blocked = client.post(LOGIN, json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert blocked.status_code == 429
    assert "Too many" in blocked.json()["detail"]


def test_parallel_failed_logins_cannot_exceed_the_account_limit(engine):
    # Uses the real session factory (no per-test transaction), so requests really overlap.
    email = f"race-{uuid.uuid4().hex[:8]}@example.com"
    with Session(engine) as s:
        auth_service.create_admin(s, email=email, password=ADMIN_PASSWORD, display_name="Race")
    app, attempts = create_app(), 12
    barrier = threading.Barrier(attempts)

    def guess(i: int) -> int:
        client = TestClient(app, client=(f"198.51.100.{i + 1}", 40000))  # a different IP each
        barrier.wait()
        return client.post(LOGIN, json={"email": email, "password": f"wrong-guess-{i}"}).status_code

    try:
        with ThreadPoolExecutor(max_workers=attempts) as pool:
            codes = list(pool.map(guess, range(attempts)))
        limit = get_settings().login_max_attempts
        assert codes.count(401) == limit and codes.count(429) == attempts - limit
    finally:
        with Session(engine) as s:
            user = s.scalar(select(AdminUser).where(AdminUser.email == email))
            s.execute(delete(LoginAttempt).where(LoginAttempt.email == email))
            s.execute(delete(AuditLog).where(AuditLog.entity_label == email))
            s.delete(user)
            s.commit()


def test_inactive_admin_cannot_sign_in(client, db, admin_user):
    admin_user.is_active = False
    db.commit()
    assert client.post(LOGIN, json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}).status_code == 401


def test_me_requires_a_session(client):
    assert client.get("/api/v1/auth/me").status_code == 401


def test_me_returns_user_and_csrf(admin):
    response = admin.get("/api/v1/auth/me")
    assert response.status_code == 200
    assert response.json()["csrf_token"] == admin.csrf


def test_logout_ends_the_session(admin, db):
    assert admin.post("/api/v1/auth/logout").status_code == 200
    assert admin.get("/api/v1/auth/me").status_code == 401
    assert db.scalar(select(AdminSession)) is None


def test_expired_session_is_rejected(admin, db):
    session = db.scalar(select(AdminSession))
    session.expires_at = datetime.now(UTC) - timedelta(minutes=1)
    db.commit()
    response = admin.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert "expired" in response.json()["detail"]


def test_tampered_cookie_is_rejected(client, admin):
    client.cookies.set(get_settings().session_cookie_name, "forged-token-value")
    assert client.get("/api/v1/auth/me").status_code == 401


def test_session_token_is_stored_hashed(admin, db, client):
    session = db.scalar(select(AdminSession))
    raw = client.cookies.get(get_settings().session_cookie_name)
    assert raw and session.token_hash != raw and len(session.token_hash) == 64


def test_password_is_stored_with_argon2id(db, admin_user):
    user = db.scalar(select(AdminUser))
    assert user.password_hash.startswith("$argon2id$")
    assert ADMIN_PASSWORD not in user.password_hash


def test_change_password(admin, client):
    weak = admin.put("/api/v1/auth/password", json={"current_password": ADMIN_PASSWORD, "new_password": "short"})
    assert weak.status_code == 422
    wrong = admin.put(
        "/api/v1/auth/password", json={"current_password": "nope", "new_password": "a-new-long-passphrase"}
    )
    assert wrong.status_code == 422 and wrong.json()["errors"][0]["field"] == "current_password"
    ok = admin.put(
        "/api/v1/auth/password", json={"current_password": ADMIN_PASSWORD, "new_password": "a-new-long-passphrase"}
    )
    assert ok.status_code == 200
    # The current session stays valid; the new password works.
    assert admin.get("/api/v1/auth/me").status_code == 200
    assert client.post(LOGIN, json={"email": ADMIN_EMAIL, "password": "a-new-long-passphrase"}).status_code == 200


def test_wrong_current_passwords_share_the_login_limit(admin, db):
    # The test shares one transaction, so now() is the same for every row: move the
    # fixture's successful sign-in back, or it would hide the failures recorded below.
    db.execute(update(LoginAttempt).values(created_at=datetime.now(UTC) - timedelta(minutes=1)))
    for i in range(5):
        body = {"current_password": f"guess-{i}", "new_password": "a-new-long-passphrase"}
        assert admin.put("/api/v1/auth/password", json=body).status_code == 422
    failures = select(func.count()).where(LoginAttempt.email == ADMIN_EMAIL, LoginAttempt.succeeded.is_(False))
    assert db.scalar(failures) == 5
    body = {"current_password": ADMIN_PASSWORD, "new_password": "a-new-long-passphrase"}
    assert admin.put("/api/v1/auth/password", json=body).status_code == 429
