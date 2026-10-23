from sqlalchemy import func, select

from app.models import AuditLog, Project, Skill, Technology
from app.tests.conftest import project_payload

ADMIN = "/api/v1/admin/projects"
PUBLIC = "/api/v1/projects"


def create(admin, category, **overrides):
    response = admin.post(ADMIN, json=project_payload(category.id, **overrides))
    assert response.status_code == 201, response.text
    return response.json()


def test_create_project_derives_slug_and_keeps_technology_order(admin, category):
    project = create(admin, category, technologies=["PyTorch", "Python", "pytorch", "Ollama"])
    assert project["slug"] == "local-ai-lab"
    assert project["technologies"] == ["PyTorch", "Python", "Ollama"]  # case-insensitive de-duplication
    assert project["category"]["slug"] == "machine-learning"
    assert project["published_at"] is not None


def test_slug_is_made_unique_when_derived(admin, category):
    first = create(admin, category)
    second = create(admin, category)
    assert first["slug"] == "local-ai-lab"
    assert second["slug"] == "local-ai-lab-2"


def test_explicit_duplicate_slug_is_a_conflict(admin, category):
    create(admin, category, slug="my-project")
    response = admin.post(ADMIN, json=project_payload(category.id, slug="my-project"))
    assert response.status_code == 409
    assert response.json()["errors"] == [{"field": "slug", "message": "A project with this slug already exists."}]


def test_missing_required_fields_are_reported_per_field(admin):
    response = admin.post(ADMIN, json={"title": ""})
    assert response.status_code == 422
    fields = {e["field"] for e in response.json()["errors"]}
    assert {"title", "summary", "category_id"} <= fields


def test_invalid_values_are_rejected(admin, category):
    cases = [
        {"status": "finished"},
        {"slug": "Not A Slug!"},
        {"start_date": "2026-13"},
        {"start_date": "2026-05", "end_date": "2025-01"},
        {"features": [{"name": "X", "status": "done"}]},
        {"notice_title": "Only a title"},
    ]
    for overrides in cases:
        response = admin.post(ADMIN, json=project_payload(category.id, **overrides))
        assert response.status_code == 422, overrides
    notice = admin.post(ADMIN, json=project_payload(category.id, notice_title="Only a title")).json()
    assert notice["errors"] == [{"field": "notice_body", "message": "A notice needs both a title and a body."}]


def test_technology_names_keep_their_identity(admin, category, client):
    clash = admin.post(ADMIN, json=project_payload(category.id, technologies=["Next.js", "Next JS"]))
    assert clash.status_code == 422 and clash.json()["errors"][0]["field"] == "technologies"
    # Names without ASCII letters are not merged into one technology.
    create(admin, category, title="A", technologies=["Русский"])
    second = create(admin, category, title="B", technologies=["日本語"])
    assert second["technologies"] == ["日本語"]
    assert client.get(f"{PUBLIC}/b").json()["technologies"] == ["日本語"]


def test_admin_page_number_is_capped(admin):
    assert admin.get(ADMIN, params={"page": 10**19}).status_code == 422
    assert admin.get("/api/v1/admin/audit-logs", params={"page": 10_001}).status_code == 422


def test_unknown_category_is_rejected(admin, category):
    response = admin.post(ADMIN, json=project_payload("3f1c0d36-0d1e-4c34-8f0a-0f8a7d5a9b11"))
    assert response.status_code == 422
    assert response.json()["errors"][0]["field"] == "category_id"


def test_update_replaces_technologies_and_categories(admin, category, other_category, db):
    project = create(admin, category)
    payload = project_payload(
        category.id,
        title="Local AI Lab v2",
        technologies=["Docker", "Python"],
        secondary_category_ids=[str(other_category.id)],
    )
    response = admin.put(f"{ADMIN}/{project['id']}", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["technologies"] == ["Docker", "Python"]
    assert body["slug"] == "local-ai-lab"  # slug is stable when not explicitly changed
    assert body["secondary_category_ids"] == [str(other_category.id)]
    public = admin.get(f"{PUBLIC}/local-ai-lab").json()
    assert [c["slug"] for c in public["categories"]] == ["machine-learning", "mlops"]


def test_publish_toggle_controls_public_visibility(admin, category, client):
    project = create(admin, category, is_published=False)
    assert client.get(f"{PUBLIC}/{project['slug']}").status_code == 404
    assert client.get(PUBLIC).json()["total"] == 0

    assert admin.patch(f"{ADMIN}/{project['id']}", json={"is_published": True}).status_code == 200
    assert client.get(f"{PUBLIC}/{project['slug']}").status_code == 200
    assert client.get(PUBLIC).json()["total"] == 1

    admin.patch(f"{ADMIN}/{project['id']}", json={"is_published": False})
    assert client.get(f"{PUBLIC}/{project['slug']}").status_code == 404


def test_feature_toggle_and_reorder(admin, category):
    a = create(admin, category, title="Alpha")
    b = create(admin, category, title="Beta")
    assert admin.patch(f"{ADMIN}/{a['id']}", json={"is_featured": True}).json()["is_featured"] is True
    assert admin.post(f"{ADMIN}/reorder", json={"ids": [b["id"], a["id"]]}).status_code == 200
    slugs = [p["slug"] for p in admin.get(PUBLIC).json()["items"]]
    assert slugs == ["beta", "alpha"]
    featured = admin.get(PUBLIC, params={"featured": "true"}).json()["items"]
    assert [p["slug"] for p in featured] == ["alpha"]


def test_reorder_rejects_unknown_ids(admin, category):
    project = create(admin, category)
    response = admin.post(f"{ADMIN}/reorder", json={"ids": [project["id"], "3f1c0d36-0d1e-4c34-8f0a-0f8a7d5a9b11"]})
    assert response.status_code == 422


def test_delete_project_keeps_skills_and_removes_orphan_technologies(admin, category, skill_category, db):
    project = create(admin, category, technologies=["UniqueTech"])
    skill = admin.post(
        "/api/v1/admin/skills",
        json={"name": "Python", "category_id": str(skill_category.id), "evidence_project_id": project["id"]},
    ).json()
    assert admin.delete(f"{ADMIN}/{project['id']}").status_code == 204
    assert admin.get(f"{ADMIN}/{project['id']}").status_code == 404
    db.expire_all()
    assert db.get(Skill, skill["id"]).evidence_project_id is None  # ON DELETE SET NULL
    assert db.scalar(select(Technology).where(Technology.slug == "uniquetech")) is None


def test_deleting_a_category_in_use_is_blocked(admin, category):
    create(admin, category)
    response = admin.delete(f"/api/v1/admin/project-categories/{category.id}")
    assert response.status_code == 409
    assert "in use" in response.json()["detail"]


def test_public_filters(admin, category, other_category, client):
    create(admin, category, title="Vision", technologies=["OpenCV", "Python"], status="completed", display_order=0)
    create(
        admin,
        category,
        title="Bench",
        technologies=["Ollama"],
        secondary_category_ids=[str(other_category.id)],
        display_order=10,
    )
    create(admin, category, title="Hidden draft", technologies=["OpenCV"], is_published=False, display_order=20)

    def slugs(**params):
        return [p["slug"] for p in client.get(PUBLIC, params=params).json()["items"]]

    assert slugs() == ["vision", "bench"]
    assert slugs(technology="opencv") == ["vision"]
    assert slugs(category="mlops") == ["bench"]
    assert slugs(status="completed") == ["vision"]
    assert slugs(search="ollama") == ["bench"]
    assert slugs(search="hidden") == []

    categories = {c["slug"]: c["project_count"] for c in client.get("/api/v1/project-categories").json()}
    assert categories == {"machine-learning": 2, "mlops": 1}
    techs = {t["name"] for t in client.get("/api/v1/technologies").json()}
    assert techs == {"OpenCV", "Python", "Ollama"}  # draft-only technologies are not listed


def test_public_pagination(admin, category, client):
    for i in range(3):
        create(admin, category, title=f"Project {i}")
    page = client.get(PUBLIC, params={"page": 2, "page_size": 2}).json()
    assert page["total"] == 3 and page["pages"] == 2 and len(page["items"]) == 1


def test_public_detail_has_case_study_but_no_admin_fields(admin, category, client):
    create(
        admin,
        category,
        images=[
            {"url": "/images/projects/x/diagram.png", "alt": "Diagram", "kind": "diagram"},
            {"url": "https://example.com/shot.png", "alt": "Screenshot"},
        ],
    )
    detail = client.get(f"{PUBLIC}/local-ai-lab").json()
    assert detail["features"][0]["status"] == "implemented"
    assert detail["cover_image"]["url"] == "https://example.com/shot.png"
    for admin_only in ("is_published", "display_order", "published_at", "id", "category_id"):
        assert admin_only not in detail


def test_changes_are_audited(admin, category, db):
    project = create(admin, category)
    admin.patch(f"{ADMIN}/{project['id']}", json={"is_published": False})
    admin.delete(f"{ADMIN}/{project['id']}")
    actions = list(
        db.scalars(select(AuditLog.action).where(AuditLog.entity_type == "project").order_by(AuditLog.created_at))
    )
    assert actions == ["create", "unpublish", "delete"]


def test_admin_list_includes_drafts_and_filters(admin, category, db):
    create(admin, category, title="Published one")
    create(admin, category, title="Draft one", is_published=False)
    all_items = admin.get(ADMIN).json()
    assert all_items["total"] == 2
    drafts = admin.get(ADMIN, params={"published": "false"}).json()["items"]
    assert [p["title"] for p in drafts] == ["Draft one"]
    assert admin.get(ADMIN, params={"search": "draft"}).json()["total"] == 1
    assert db.scalar(select(func.count()).select_from(Project)) == 2
