from datetime import datetime

from sqlalchemy import DateTime, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, UUIDPrimaryKey


class PageView(UUIDPrimaryKey, Base):
    """One visit to a public page, recorded without cookies or personal data.

    `visitor` is a hash of the IP address and browser that changes every day, so a person
    can be counted once per day but never identified or followed from one day to the next.
    """

    __tablename__ = "page_views"
    __table_args__ = (Index("ix_page_views_visitor_created_at", "visitor", "created_at"),)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    path: Mapped[str] = mapped_column(String(300), nullable=False)
    # Only the site a visitor came from ("linkedin.com"), never the full address.
    referrer_host: Mapped[str | None] = mapped_column(String(255))
    visitor: Mapped[str] = mapped_column(String(32), nullable=False)
    device: Mapped[str] = mapped_column(String(10), nullable=False)
