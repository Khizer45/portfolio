"""profile photo, extra navigation links, footer text

Revision ID: 0002_profile_extras
Revises: 0001_initial
Create Date: 2026-10-27

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0002_profile_extras'
down_revision: Union[str, Sequence[str], None] = '0001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('profile_settings', sa.Column('nav_links', postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'[]'"), nullable=False))
    op.add_column('profile_settings', sa.Column('footer_text', sa.String(length=300), server_default='', nullable=False))
    op.add_column('profile_settings', sa.Column('photo', sa.LargeBinary(), nullable=True))
    op.add_column('profile_settings', sa.Column('photo_type', sa.String(length=32), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('profile_settings', 'photo_type')
    op.drop_column('profile_settings', 'photo')
    op.drop_column('profile_settings', 'footer_text')
    op.drop_column('profile_settings', 'nav_links')
