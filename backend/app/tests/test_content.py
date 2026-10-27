"""Skills, experience, certifications, education, achievements, articles, profile, dashboard."""

from app.tests.conftest import project_payload


def test_skills_crud_visibility_and_grouping(admin, client, skill_category, db):
    created = admin.post(
        "/api/v1/admin/skills",
        json={"name": "Python", "category_id": str(skill_category.id), "level": "intermediate", "is_featured": True},
    )
    assert created.status_code == 201
    skill = created.json()
    assert skill["category"]["title"] == "Programming Languages"

    duplicate = admin.post("/api/v1/admin/skills", json={"name": "python", "category_id": str(skill_category.id)})
    assert duplicate.status_code == 409
    assert duplicate.json()["errors"][0]["field"] == "name"

    bad_level = admin.post(
        "/api/v1/admin/skills", json={"name": "Go", "category_id": str(skill_category.id), "level": "95%"}
    )
    assert bad_level.status_code == 422

    groups = client.get("/api/v1/skills").json()
    assert groups[0]["title"] == "Programming Languages"
    assert groups[0]["skills"][0]["name"] == "Python"

    admin.patch(f"/api/v1/admin/skills/{skill['id']}", json={"is_visible": False})
    assert client.get("/api/v1/skills").json() == []

    updated = admin.put(
        f"/api/v1/admin/skills/{skill['id']}",
        json={"name": "Python 3", "category_id": str(skill_category.id), "level": "advanced", "is_visible": True},
    )
    assert updated.status_code == 200 and updated.json()["level"] == "advanced"
    assert admin.delete(f"/api/v1/admin/skills/{skill['id']}").status_code == 204


def test_skill_evidence_link_hidden_for_unpublished_project(admin, client, category, skill_category):
    project = admin.post("/api/v1/admin/projects", json=project_payload(category.id, is_published=False)).json()
    admin.post(
        "/api/v1/admin/skills",
        json={"name": "PyTorch", "category_id": str(skill_category.id), "evidence_project_id": project["id"]},
    )
    skill = client.get("/api/v1/skills").json()[0]["skills"][0]
    assert skill["evidence_project"] is None


def test_long_category_titles_get_slugs_that_fit(admin):
    # Category slug columns hold 80 characters; titles may have 120.
    long_title = "Machine learning " * 7
    project_category = admin.post("/api/v1/admin/project-categories", json={"title": long_title, "short_title": "ML"})
    assert project_category.status_code == 201 and len(project_category.json()["slug"]) <= 80
    skill_category = admin.post("/api/v1/admin/skill-categories", json={"title": long_title})
    assert skill_category.status_code == 201 and len(skill_category.json()["slug"]) <= 80
    explicit = admin.post("/api/v1/admin/skill-categories", json={"title": "X", "slug": "a" * 81})
    assert explicit.status_code == 422 and explicit.json()["errors"][0]["field"] == "slug"


def test_skill_category_in_use_cannot_be_deleted(admin, skill_category):
    admin.post("/api/v1/admin/skills", json={"name": "Java", "category_id": str(skill_category.id)})
    response = admin.delete(f"/api/v1/admin/skill-categories/{skill_category.id}")
    assert response.status_code == 409


def test_experience_validation_ordering_and_confidential_clients(admin, client):
    base = {"organization": "Acme", "role": "Intern", "employment_type": "internship", "start_date": "2025-07"}
    # Cross-field rules are reported on the field they concern, without Pydantic's prefix.
    current = admin.post("/api/v1/admin/experiences", json={**base, "is_current": True, "end_date": "2025-10"})
    assert current.status_code == 422
    assert current.json()["errors"] == [{"field": "end_date", "message": "A current position cannot have an end date."}]
    order = admin.post("/api/v1/admin/experiences", json={**base, "end_date": "2025-01"})
    assert order.json()["errors"] == [{"field": "end_date", "message": "End date must not be before the start date."}]
    assert admin.post("/api/v1/admin/experiences", json={**base, "employment_type": "boss"}).status_code == 422

    admin.post("/api/v1/admin/experiences", json={**base, "end_date": "2025-10"})
    admin.post(
        "/api/v1/admin/experiences",
        json={
            **base,
            "organization": "Secret Co",
            "role": "Freelance developer",
            "employment_type": "freelance",
            "start_date": "2026-01",
            "is_current": True,
            "is_confidential": True,
            "organization_url": "https://secret.example",
            "link_url": "https://secret.example/case-study",
        },
    )
    hidden = admin.post("/api/v1/admin/experiences", json={**base, "role": "Hidden", "is_visible": False})
    assert hidden.status_code == 201

    public = client.get("/api/v1/experiences").json()
    assert [e["role"] for e in public] == ["Freelance developer", "Intern"]  # current first
    assert public[0]["organization"] == "Confidential client"
    assert public[0]["organization_url"] is None and public[0]["link_url"] is None
    assert public[0]["link_label"] is None
    assert "Secret Co" not in client.get("/api/v1/experiences").text
    assert "secret.example" not in client.get("/api/v1/experiences").text


def test_certifications_only_visible_ones_are_public(admin, client):
    payload = {
        "name": "Cloud Practitioner",
        "issuer": "AWS",
        "issue_date": "2026-11",
        "verification_url": "https://example.com/verify",
        "related_skills": ["AWS"],
    }
    cert = admin.post("/api/v1/admin/certifications", json=payload).json()
    assert client.get("/api/v1/certifications").json()[0]["name"] == "Cloud Practitioner"
    admin.patch(f"/api/v1/admin/certifications/{cert['id']}", json={"is_visible": False})
    assert client.get("/api/v1/certifications").json() == []
    bad = admin.post("/api/v1/admin/certifications", json={**payload, "expiration_date": "2025-01"})
    assert bad.status_code == 422


def test_only_one_primary_education(admin, client):
    first = admin.post(
        "/api/v1/admin/education",
        json={
            "institution": "MUST",
            "qualification": "BS Software Engineering",
            "start_date": "2022-10",
            "end_date": "2026-10",
            "is_primary": True,
        },
    ).json()
    second = admin.post(
        "/api/v1/admin/education",
        json={"institution": "Uni", "qualification": "MS AI", "start_date": "2027", "is_primary": True},
    ).json()
    assert second["is_primary"] is True
    assert admin.get(f"/api/v1/admin/education/{first['id']}").json()["is_primary"] is False
    public = client.get("/api/v1/education").json()
    assert public[0]["qualification"] == "MS AI"


def test_achievements(admin, client):
    response = admin.post(
        "/api/v1/admin/achievements",
        json={"type": "award", "title": "Dean's List", "issuer": "MUST", "date": "2026-06"},
    )
    assert response.status_code == 201
    assert client.get("/api/v1/achievements").json()[0]["title"] == "Dean's List"
    assert (
        admin.post(
            "/api/v1/admin/achievements", json={"type": "trophy", "title": "X", "issuer": "Y", "date": "2026"}
        ).status_code
        == 422
    )


def test_articles_drafts_are_never_public(admin, client, category):
    project = admin.post("/api/v1/admin/projects", json=project_payload(category.id)).json()
    draft = admin.post(
        "/api/v1/admin/articles",
        json={
            "title": "Benchmarking local LLMs",
            "summary": "Method.",
            "content": "## Intro\n\nText.",
            "related_project_id": project["id"],
        },
    ).json()
    assert draft["status"] == "draft" and draft["slug"] == "benchmarking-local-llms"
    assert client.get("/api/v1/articles").json()["total"] == 0
    assert client.get("/api/v1/articles/benchmarking-local-llms").status_code == 404
    assert client.get(f"/api/v1/projects/{project['slug']}").json()["related_articles"] == []

    published = admin.patch(f"/api/v1/admin/articles/{draft['id']}", json={"status": "published"}).json()
    assert published["published_at"] is not None
    article = client.get("/api/v1/articles/benchmarking-local-llms").json()
    assert article["content"].startswith("## Intro")
    assert article["related_project"]["slug"] == project["slug"]
    assert client.get(f"/api/v1/projects/{project['slug']}").json()["related_articles"][0]["slug"] == article["slug"]

    empty = admin.post("/api/v1/admin/articles", json={"title": "Empty", "summary": "S", "status": "published"})
    assert empty.status_code == 422


def test_profile_update_validates_urls_and_email(admin, client):
    assert client.get("/api/v1/profile").status_code == 404
    payload = {
        "display_name": "Khizer Hayat",
        "headline": "Software Engineer",
        "contact_email": "khizer@example.com",
        "github_url": "https://github.com/Khizer45",
        "cv_url": "/cv/Khizer%20Hayat-CV.pdf",
        "social_links": [{"label": "Kaggle", "url": "https://kaggle.com/x"}],
    }
    assert admin.put("/api/v1/admin/profile", json=payload).status_code == 200
    profile = client.get("/api/v1/profile").json()
    assert profile["contact_email"] == "khizer@example.com" and profile["cv_url"] == "/cv/Khizer%20Hayat-CV.pdf"

    for bad in (
        {"contact_email": "not-an-email"},
        {"github_url": "github.com/x"},
        {"cv_url": "file:///etc/passwd"},
        {"social_links": [{"label": "X", "url": "ftp://x"}]},
        # The frontend decodes these paths: only valid escapes, and no hidden '..' or backslashes.
        {"cv_url": "/cv/CV-100%.pdf"},
        {"cv_url": "/cv/%ff.pdf"},
        {"cv_url": "/%2e%2e/%2e%2e/etc/passwd"},
        {"cv_url": "/cv/%5C..%5Cx.pdf"},
        {"cv_url": "/cv/%0a.pdf"},
        {"profile_image_url": "/" + "a" * 2100},  # longer than the column
    ):
        response = admin.put("/api/v1/admin/profile", json={**payload, **bad})
        assert response.status_code == 422, bad


def test_dashboard_stats_come_from_the_database(admin, category, skill_category):
    admin.post("/api/v1/admin/projects", json=project_payload(category.id))
    admin.post("/api/v1/admin/projects", json=project_payload(category.id, is_published=False))
    admin.post(
        "/api/v1/admin/skills", json={"name": "Python", "category_id": str(skill_category.id), "is_visible": False}
    )
    stats = admin.get("/api/v1/admin/stats").json()
    assert stats["projects_published"] == 1
    assert stats["projects_draft"] == 1
    assert stats["skills"] == 1 and stats["skills_hidden"] == 1
    assert stats["recent_changes"][0]["action"] == "create"
    assert stats["recent_changes"][0]["actor"] == "Test Admin"
    assert stats["recent_changes"][0]["ip_address"] == "testclient"  # TestClient's peer address


def test_technology_rename_and_merge_conflict(admin, category):
    admin.post("/api/v1/admin/projects", json=project_payload(category.id, technologies=["Pytorch", "Python"]))
    techs = {t["name"]: t for t in admin.get("/api/v1/admin/technologies").json()}
    renamed = admin.put(f"/api/v1/admin/technologies/{techs['Pytorch']['id']}", json={"name": "PyTorch"})
    assert renamed.status_code == 200 and renamed.json()["project_count"] == 1
    clash = admin.put(f"/api/v1/admin/technologies/{techs['Pytorch']['id']}", json={"name": "python"})
    assert clash.status_code == 409


def test_health(client):
    assert client.get("/health").json() == {"status": "ok", "database": "ok"}


def _create_profile(admin):
    response = admin.put("/api/v1/admin/profile", json={"display_name": "Khizer Hayat", "headline": "Engineer"})
    assert response.status_code == 200, response.text


JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 64


def test_profile_photo_upload_serve_and_delete(admin, client):
    _create_profile(admin)
    response = admin.put("/api/v1/admin/profile/photo", content=JPEG, headers={"Content-Type": "image/jpeg"})
    assert response.status_code == 200, response.text
    url = response.json()["profile_image_url"]
    assert url.startswith("/api/v1/profile/photo/")
    assert client.get("/api/v1/profile").json()["profile_image_url"] == url

    photo = client.get(url)
    assert photo.status_code == 200 and photo.content == JPEG
    assert photo.headers["content-type"] == "image/jpeg"
    assert "immutable" in photo.headers["cache-control"]
    # The bytes never appear in JSON responses.
    assert "photo" not in client.get("/api/v1/profile").json()

    # A save from the admin form keeps the uploaded photo's URL valid (it passes the path validator).
    profile = admin.get("/api/v1/admin/profile").json()
    body = {k: profile[k] for k in ("display_name", "headline", "profile_image_url")}
    assert admin.put("/api/v1/admin/profile", json=body).status_code == 200

    response = admin.delete("/api/v1/admin/profile/photo")
    assert response.status_code == 200 and response.json()["profile_image_url"] is None
    assert client.get(url).status_code == 404


def test_profile_photo_rejects_wrong_or_oversized_files(admin):
    _create_profile(admin)
    cases = [
        (b"<svg onload=alert(1)>", "image/svg+xml"),
        (b"GIF89a" + b"\x00" * 10, "image/jpeg"),  # content doesn't match the declared type
        (b"RIFF\x00\x00\x00\x00WAVE", "image/webp"),
        (b"", "image/png"),
        (b"\xff\xd8\xff" + b"\x00" * 1_600_000, "image/jpeg"),
    ]
    for data, content_type in cases:
        response = admin.put("/api/v1/admin/profile/photo", content=data, headers={"Content-Type": content_type})
        assert response.status_code == 422, (content_type, response.status_code)
        assert response.json()["errors"][0]["field"] == "photo"


def test_profile_nav_links_and_footer_text(admin, client):
    payload = {
        "display_name": "Khizer Hayat",
        "headline": "Engineer",
        "footer_text": "Building practical AI systems.",
        "nav_links": [{"label": "Blog", "url": "https://blog.example.com"}, {"label": "Talks", "url": "/writing"}],
    }
    assert admin.put("/api/v1/admin/profile", json=payload).status_code == 200
    profile = client.get("/api/v1/profile").json()
    assert profile["footer_text"] == "Building practical AI systems."
    assert [link["label"] for link in profile["nav_links"]] == ["Blog", "Talks"]

    bad = admin.put(
        "/api/v1/admin/profile", json={**payload, "nav_links": [{"label": "X", "url": "javascript:alert(1)"}]}
    )
    assert bad.status_code == 422
    too_many = [{"label": f"L{i}", "url": "/projects"} for i in range(7)]
    assert admin.put("/api/v1/admin/profile", json={**payload, "nav_links": too_many}).status_code == 422
