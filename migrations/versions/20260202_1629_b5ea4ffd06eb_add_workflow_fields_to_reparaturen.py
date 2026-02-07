"""add_workflow_fields_to_reparaturen

Revision ID: b5ea4ffd06eb
Revises: 7d0e1f5e4f4h
Create Date: 2026-02-02 16:29:08.725100

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b5ea4ffd06eb'
down_revision: Union[str, None] = '7d0e1f5e4f4h'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Workflow-Felder hinzufügen
    op.add_column('reparaturen', sa.Column('begonnen_am', sa.DateTime(), nullable=True))
    op.add_column('reparaturen', sa.Column('prioritaet', sa.Integer(), server_default='3', nullable=True))
    op.add_column('reparaturen', sa.Column('meister_zugewiesen', sa.String(length=100), nullable=True))


def downgrade() -> None:
    # Workflow-Felder entfernen (falls Rollback nötig)
    op.drop_column('reparaturen', 'meister_zugewiesen')
    op.drop_column('reparaturen', 'prioritaet')
    op.drop_column('reparaturen', 'begonnen_am')