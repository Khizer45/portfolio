"""Authorization, CSRF, and data-exposure checks across the whole API."""

import json
import re
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import DataError
from starlette.requests import Request

from app.api.deps import get_client_ip
from app.core.config import get_settings
from app.tests.conftest import project_payload

RANDOM_ID = str(uuid.uuid4())


def _operations(app, prefix: str):
    for path, methods in app.openapi()["paths"].items():
        if path.startswith(prefix):
            for method in methods:
                yield method.upper(), re.sub(r"\{[^}]+\}", RANDOM_ID, path)


def test_every_admin_endpoint_rejects_anonymous_requests(app, client):
    operations = list(_operations(app, "/api/v1/admin"))
    assert len(operations) > 50  # sanity: the whole admin surface is covered
    for method, path in operations:
        response = client.request(method, path, json={})
        assert response.status_code == 401, f"{method} {path} returned {response.status_code}"


def test_every_admin_write_requires_csrf_token(app, admin):
    for method, path in _operations(app, "/api/v1/admin"):
        if method in {"POST", "PUT", "PATCH", "DELETE"}:
            response = admin.client.request(method, path, json={})
            assert response.status_code == 403, f"{method} {path} returned {response.status_code}"


def test_wrong_csrf_token_is_rejected(admin):
    response = admin.client.post(
        "/api/v1/admin/skill-categories", json={"title": "X"}, headers={"X-CSRF-Token": "0" * 64}
    )
    assert response.status_code == 403


def test_cross_site_origin_is_rejected_even_with_valid_csrf(admin):
    response = admin.post(
        "/api/v1/admin/skill-categories", json={"title": "X"}, headers={"Origin": "https://evil.example"}
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "Request origin is not allowed."


def test_allowed_frontend_origin_is_accepted(admin):
    response = admin.post(
        "/api/v1/admin/skill-categories", json={"title": "Languages"}, headers={"Origin": "http://localhost:3000"}
    )
    assert response.status_code == 201


def test_login_from_foreign_origin_is_rejected(client, admin_user):
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "correct-horse-battery-staple"},
        headers={"Origin": "https://evil.example"},
    )
    assert response.status_code == 403


def test_cors_only_allows_configured_origin(client):
    allowed = client.options(
        "/api/v1/projects", headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "GET"}
    )
    assert allowed.headers.get("access-control-allow-origin") == "http://localhost:3000"
    denied = client.options(
        "/api/v1/projects", headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "GET"}
    )
    assert "access-control-allow-origin" not in denied.headers


@pytest.mark.parametrize(
    "url", ["/api/v1/auth/me", "/api/v1/admin/stats", "/api/v1/admin/projects", "/api/v1/admin/profile"]
)
def test_responses_never_contain_secrets(admin, url, category):
    admin.post("/api/v1/admin/projects", json=project_payload(category.id))
    response = admin.get(url)
    assert response.status_code == 200
    text = response.text
    for forbidden in ("password_hash", "token_hash", "$argon2", "secret_key", "test-secret-key"):
        assert forbidden not in text


def test_login_response_does_not_leak_password_hash(client, admin_user):
    response = client.post(
        "/api/v1/auth/login", json={"email": "admin@example.com", "password": "correct-horse-battery-staple"}
    )
    assert "password" not in json.dumps(response.json()["user"])


def test_security_headers_are_present(client):
    response = client.get("/api/v1/projects")
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["content-security-policy"].startswith("default-src 'none'")
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["x-request-id"]


def test_server_errors_do_not_leak_internals(app, client):
    @app.get("/boom")
    def boom():
        raise RuntimeError("database password is hunter2")

    response = TestClient(app, raise_server_exceptions=False).get("/boom")
    assert response.status_code == 500
    assert response.json() == {"detail": "Internal server error"}
    assert "hunter2" not in response.text


@pytest.mark.parametrize(
    "proxies,header,expected",
    [
        (0, "203.0.113.7", "10.0.0.1"),  # no trusted proxy: the header is ignored
        (1, "203.0.113.7, 198.51.100.9", "198.51.100.9"),  # left-hand entries come from the client
        (2, "203.0.113.7, 198.51.100.9", "203.0.113.7"),
        (2, "198.51.100.9", "10.0.0.1"),  # fewer entries than proxies
        (1, "not-an-ip", "10.0.0.1"),
    ],
)
def test_client_ip_is_taken_from_trusted_proxies_only(proxies, header, expected):
    request = Request({"type": "http", "headers": [(b"x-forwarded-for", header.encode())], "client": ("10.0.0.1", 1)})
    settings = get_settings().model_copy(update={"trusted_proxy_count": proxies})
    assert get_client_ip(request, settings) == expected


def test_oversized_bodies_are_rejected_before_parsing(client):
    headers = {"content-type": "application/json"}
    too_big = b"[" + b"{}," * 700_000 + b"{}]"  # > 2 MB
    response = client.post("/api/v1/admin/projects", content=too_big, headers=headers)
    assert response.status_code == 413
    assert response.json() == {"detail": "Request body is too large."}
    # Without Content-Length (chunked), the bytes are counted as they arrive.
    chunked = client.post("/api/v1/admin/projects", content=iter([too_big[:1_500_000], too_big[1_500_000:]]))
    assert chunked.status_code == 413
    login = client.post("/api/v1/auth/login", content=b'{"email": "' + b"a" * 17_000 + b'"}', headers=headers)
    assert login.status_code == 413


@pytest.mark.parametrize(
    "method,path,params",
    [
        ("GET", "/api/v1/projects", {"search": "a\x00"}),
        ("GET", "/api/v1/articles", {"tag": "a\x00"}),
        ("GET", "/api/v1/projects/a%00", None),
    ],
)
def test_nul_characters_in_urls_are_rejected(app, method, path, params):
    response = TestClient(app, raise_server_exceptions=False).request(method, path, params=params)
    assert response.status_code == 422


def test_nul_characters_in_bodies_are_reported_per_field(admin, category):
    payload = project_payload(category.id, features=[{"name": "a\x00b"}])
    response = admin.post("/api/v1/admin/projects", json=payload)
    assert response.status_code == 422
    assert response.json()["errors"][0]["field"] == "features.0.name"


def test_database_value_errors_are_a_422_without_details(app):
    @app.get("/too-long")
    def too_long():
        raise DataError("UPDATE x SET slug = %(slug)s", {}, Exception("value too long for type character varying(80)"))

    response = TestClient(app, raise_server_exceptions=False).get("/too-long")
    assert response.status_code == 422
    assert "character varying" not in response.text and "UPDATE" not in response.text


def test_unsafe_urls_are_rejected(admin, category):
    payload = project_payload(category.id, github_url="javascript:alert(1)")
    response = admin.post("/api/v1/admin/projects", json=payload)
    assert response.status_code == 422
    assert response.json()["errors"][0]["field"] == "github_url"

    image = {"url": "/../../etc/passwd", "alt": "x"}
    response = admin.post("/api/v1/admin/projects", json=project_payload(category.id, images=[image]))
    assert response.status_code == 422


def test_unknown_fields_are_rejected(admin, category):
    payload = project_payload(category.id, is_admin=True)
    response = admin.post("/api/v1/admin/projects", json=payload)
    assert response.status_code == 422
