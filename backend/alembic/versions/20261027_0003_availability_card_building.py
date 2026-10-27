"""home page availability card and "currently building" list

Revision ID: 0003_availability_card
Revises: 0002_profile_extras
Create Date: 2026-10-27

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '0003_availability_card'
down_revision: Union[str, Sequence[str], None] = '0002_profile_extras'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('profile_settings', sa.Column('availability_heading', sa.String(length=120), server_default='', nullable=False))
    op.add_column('profile_settings', sa.Column('availability_note', sa.String(length=400), server_default='', nullable=False))
    op.add_column('profile_settings', sa.Column('work_preference', sa.String(length=120), server_default='', nullable=False))
    op.add_column('profile_settings', sa.Column('timezone', sa.String(length=60), server_default='', nullable=False))
    op.add_column('profile_settings', sa.Column('currently_building', postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'[]'"), nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('profile_settings', 'currently_building')
    op.drop_column('profile_settings', 'timezone')
    op.drop_column('profile_settings', 'work_preference')
    op.drop_column('profile_settings', 'availability_note')
    op.drop_column('profile_settings', 'availability_heading')
