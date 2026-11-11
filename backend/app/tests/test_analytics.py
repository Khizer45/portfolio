from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.models import PageView

BROWSER = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0 Safari/537.36"}
PHONE = {"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Mobile/15E148 Safari/604.1"}


def _view(client, path="/", referrer=None, headers=BROWSER):
    return client.post("/api/v1/views", json={"path": path, "referrer": referrer}, headers=headers)


def test_page_views_are_recorded_without_personal_data(client, db):
    response = _view(client, "/projects", "https://www.linkedin.com/feed/?trk=abc")
    assert response.json() == {"counted": True, "reason": None}
    view = db.scalar(select(PageView))
    assert view.path == "/projects"
    assert view.referrer_host == "linkedin.com"  # only the site, never the full address
    assert view.device == "desktop"
    assert len(view.visitor) == 32 and "testclient" not in view.visitor  # a hash, not an address


def test_repeats_bots_and_admin_pages_are_not_counted(client, db):
    _view(client, "/about")
    repeat = _view(client, "/about")  # same visitor, same page, within 30 minutes
    assert repeat.json() == {"counted": False, "reason": "already counted in the last 30 minutes"}
    _view(client, "/admin/login")
    _view(client, "/api/v1/profile")
    _view(client, "/", headers={"User-Agent": "Googlebot/2.1 (+http://www.google.com/bot.html)"})
    _view(client, "/", headers={"User-Agent": "Mozilla/5.0 HeadlessChrome/130.0"})
    _view(client, "/", headers={"User-Agent": ""})
    assert [v.path for v in db.scalars(select(PageView))] == ["/about"]


def test_the_signed_in_admin_is_not_counted(admin, db):
    assert _view(admin.client, "/").json() == {"counted": False, "reason": "signed in to the admin"}
    assert db.scalar(select(PageView)) is None


def test_invalid_views_are_rejected(client):
    assert _view(client, "https://evil.example/").status_code == 422
    assert _view(client, "/" + "a" * 400).status_code == 422
    assert client.post("/api/v1/views", json={"path": "/", "extra": 1}, headers=BROWSER).status_code == 422
    foreign = client.post("/api/v1/views", json={"path": "/"}, headers={**BROWSER, "Origin": "https://evil.example"})
    assert foreign.status_code == 403


def test_admin_analytics_counts_views_visitors_pages_and_sources(app, admin, db):
    client = TestClient(app)  # a visitor: no admin session cookie
    _view(client, "/", "https://www.linkedin.com/")
    _view(client, "/projects")
    _view(client, "/", headers=PHONE)
    _view(client, "/projects/skyntri", "https://github.com/Khizer45", headers=PHONE)
    # An old visit (outside the 7-day window) still counts towards the all-time total.
    db.add(PageView(path="/", visitor="x" * 32, device="desktop", created_at=datetime.now(UTC) - timedelta(days=40)))
    db.commit()

    stats = admin.get("/api/v1/admin/analytics", params={"days": 7}).json()
    assert stats["days"] == 7 and len(stats["daily"]) == 7
    assert (stats["views_today"], stats["visitors_today"]) == (4, 2)
    assert (stats["views"], stats["visitors"], stats["views_all_time"]) == (4, 2, 5)
    assert stats["daily"][-1] == {"date": stats["daily"][-1]["date"], "views": 4, "visitors": 2}
    assert stats["top_pages"][0] == {"label": "/", "count": 2}
    assert {r["label"] for r in stats["top_referrers"]} == {"linkedin.com", "github.com"}
    assert {d["label"]: d["count"] for d in stats["devices"]} == {"desktop": 2, "mobile": 2}
    assert admin.get("/api/v1/admin/analytics", params={"days": 2}).status_code == 422


def test_analytics_requires_admin(client):
    assert client.get("/api/v1/admin/analytics").status_code == 401
