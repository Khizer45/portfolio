from datetime import date
from typing import Annotated

from pydantic import StringConstraints

from app.schemas.common import ReadSchema, Schema


class PageViewIn(Schema):
    """Sent by the public site's page-view tracker."""

    path: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=300, pattern=r"^/")]
    referrer: Annotated[str | None, StringConstraints(max_length=2048)] = None


class PageViewResult(ReadSchema):
    counted: bool
    # Why a view wasn't counted, e.g. "signed in to the admin" (helps when checking the stats).
    reason: str | None = None


class DailyVisits(ReadSchema):
    date: date
    views: int
    visitors: int


class CountItem(ReadSchema):
    label: str
    count: int


class SiteAnalytics(ReadSchema):
    days: int
    views_today: int
    visitors_today: int
    views: int
    visitors: int
    views_all_time: int
    daily: list[DailyVisits]
    top_pages: list[CountItem]
    top_referrers: list[CountItem]
    devices: list[CountItem]
