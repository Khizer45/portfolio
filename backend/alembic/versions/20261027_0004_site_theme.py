"""site appearance settings (theme preset, colours, pattern, cards, corners)

Revision ID: 0004_site_theme
Revises: 0003_availability_card
Create Date: 2026-10-27

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '0004_site_theme'
down_revision: Union[str, Sequence[str], None] = '0003_availability_card'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('profile_settings', sa.Column('theme_preset', sa.String(length=20), server_default='blueprint', nullable=False))
    op.add_column('profile_settings', sa.Column('theme_mode', sa.String(length=10), server_default='light', nullable=False))
    op.add_column('profile_settings', sa.Column('theme_accent', sa.String(length=7), nullable=True))
    op.add_column('profile_settings', sa.Column('theme_button', sa.String(length=7), nullable=True))
    op.add_column('profile_settings', sa.Column('theme_pattern', sa.String(length=10), server_default='grid', nullable=False))
    op.add_column('profile_settings', sa.Column('theme_cards', sa.String(length=10), server_default='offset', nullable=False))
    op.add_column('profile_settings', sa.Column('theme_corners', sa.String(length=10), server_default='rounded', nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('profile_settings', 'theme_corners')
    op.drop_column('profile_settings', 'theme_cards')
    op.drop_column('profile_settings', 'theme_pattern')
    op.drop_column('profile_settings', 'theme_button')
    op.drop_column('profile_settings', 'theme_accent')
    op.drop_column('profile_settings', 'theme_mode')
    op.drop_column('profile_settings', 'theme_preset')
