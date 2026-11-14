import json
import urllib.error

import pytest

from app.services import github_import

REPOS = [
    {
        "name": "local-ai-lab",
        "full_name": "Khizer45/local-ai-lab",
        "description": "Benchmark ML models and local LLMs side by side.",
        "html_url": "https://github.com/Khizer45/local-ai-lab",
        "homepage": "https://lab.example.com",
        "language": "Python",
        "topics": ["fastapi", "pytorch", "ollama", "python"],
        "stargazers_count": 3,
        "fork": False,
        "archived": False,
        "created_at": "2025-03-14T10:00:00Z",
        "pushed_at": "2026-10-01T10:00:00Z",
    },
    {
        "name": "notes_app",
        "full_name": "Khizer45/notes_app",
        "description": None,
        "html_url": "https://github.com/Khizer45/notes_app",
        "homepage": "",
        "language": "JavaScript",
        "topics": [],
        "stargazers_count": 0,
        "fork": False,
        "archived": True,
        "created_at": "2024-01-02T10:00:00Z",
        "pushed_at": "2024-02-01T10:00:00Z",
    },
]
README = """# Notes App

[![Build](https://img.shields.io/badge/build-passing-green)](https://ci.example.com)

A **simple** note-taking app with [offline sync](https://docs.example.com) and tags.

## Setup
"""


@pytest.fixture
def fake_github(monkeypatch):
    calls = []

    def fake_request(path, accept="application/vnd.github+json"):
        calls.append(path)
        if path.startswith("/users/nobody-here/"):
            raise urllib.error.HTTPError(path, 404, "Not Found", None, None)
        if path.startswith("/users/"):
            return json.dumps(REPOS).encode()
        if path == "/repos/Khizer45/notes_app/readme":
            return README.encode()
        raise urllib.error.HTTPError(path, 404, "Not Found", None, None)

    monkeypatch.setattr(github_import, "_request", fake_request)
    return calls


@pytest.fixture
def category(admin):
    return admin.post("/api/v1/admin/project-categories", json={"title": "Imported", "short_title": "Imp"}).json()


def test_lists_public_repositories(admin, fake_github):
    repos = admin.get("/api/v1/admin/projects/github-repos", params={"username": "@Khizer45"}).json()
    assert [r["name"] for r in repos] == ["local-ai-lab", "notes_app"]
    assert repos[0]["topics"] == ["fastapi", "pytorch", "ollama", "python"]
    assert repos[1]["archived"] is True and repos[0]["already_imported"] is False


def test_unknown_or_invalid_usernames(admin, fake_github):
    unknown = admin.get("/api/v1/admin/projects/github-repos", params={"username": "nobody-here"})
    assert unknown.status_code == 422
    assert unknown.json()["errors"][0]["message"] == "No GitHub user with this name."
    bad = admin.get("/api/v1/admin/projects/github-repos", params={"username": "../../etc"})
    assert bad.status_code == 422 and fake_github == [
        "/users/nobody-here/repos?type=owner&sort=pushed&per_page=100&page=1"
    ]


def test_import_creates_drafts_from_repo_details(admin, client, fake_github, category):
    body = {
        "username": "Khizer45",
        "repos": ["local-ai-lab", "notes_app"],
        "category_id": category["id"],
        "status": "completed",
    }
    result = admin.post("/api/v1/admin/projects/import-github", json=body)
    assert result.status_code == 201, result.text
    assert result.json() == {"created": ["Local AI Lab", "Notes App"], "skipped": []}

    projects = {p["title"]: p for p in admin.get("/api/v1/admin/projects").json()["items"]}
    lab = admin.get(f"/api/v1/admin/projects/{projects['Local AI Lab']['id']}").json()
    assert lab["summary"] == "Benchmark ML models and local LLMs side by side."
    assert lab["github_url"] == "https://github.com/Khizer45/local-ai-lab"
    assert lab["demo_url"] == "https://lab.example.com"
    assert lab["technologies"] == ["Python", "FastAPI", "PyTorch", "Ollama"]
    assert (lab["status"], lab["start_date"], lab["is_published"]) == ("completed", "2025-03", False)
    notes = admin.get(f"/api/v1/admin/projects/{projects['Notes App']['id']}").json()
    # No description on GitHub: the README's first paragraph, as plain text.
    assert notes["summary"] == "A simple note-taking app with offline sync and tags."
    # Drafts: nothing appears on the public site until published.
    assert all(p["title"] not in ("Local AI Lab", "Notes App") for p in client.get("/api/v1/projects").json()["items"])

    again = admin.post("/api/v1/admin/projects/import-github", json=body).json()
    assert again == {"created": [], "skipped": ["local-ai-lab", "notes_app"]}
    listed = admin.get("/api/v1/admin/projects/github-repos", params={"username": "Khizer45"}).json()
    assert all(r["already_imported"] for r in listed)


def test_import_rejects_unknown_category(admin, fake_github):
    body = {"username": "Khizer45", "repos": ["notes_app"], "category_id": "00000000-0000-0000-0000-000000000000"}
    assert admin.post("/api/v1/admin/projects/import-github", json=body).status_code == 404


def test_github_rate_limit_is_reported(admin, monkeypatch):
    def limited(*args, **kwargs):
        raise urllib.error.HTTPError("x", 403, "rate limited", None, None)

    monkeypatch.setattr(github_import.urllib.request, "urlopen", limited)
    response = admin.get("/api/v1/admin/projects/github-repos", params={"username": "Khizer45"})
    assert response.status_code == 409
    assert "limit" in response.json()["detail"]
