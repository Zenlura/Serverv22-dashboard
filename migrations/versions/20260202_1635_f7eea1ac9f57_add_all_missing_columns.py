"""add_all_missing_columns

Revision ID: f7eea1ac9f57
Revises: b5ea4ffd06eb
Create Date: 2026-02-02 16:35:00
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f7eea1ac9f57'
down_revision: Union[str, None] = 'b5ea4ffd06eb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Vermietungen: rad_abgeholt und abholzeit hinzufügen
    op.add_column('vermietungen', sa.Column('rad_abgeholt', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('vermietungen', sa.Column('abholzeit', sa.DateTime(), nullable=True))
    
    # Artikel: typ Spalte hinzufügen
    op.add_column('artikel', sa.Column('typ', sa.String(length=20), server_default='material', nullable=False))


def downgrade() -> None:
    op.drop_column('artikel', 'typ')
    op.drop_column('vermietungen', 'abholzeit')
    op.drop_column('vermietungen', 'rad_abgeholt')
