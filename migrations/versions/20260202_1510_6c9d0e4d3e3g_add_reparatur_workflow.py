"""add_reparatur_workflow_tracking

Revision ID: 6c9d0e4d3e3g
Revises: 5b8c9d0e3c2f
Create Date: 2026-02-02 15:10:00

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '6c9d0e4d3e3g'
down_revision = '5b8c9d0e3c2f'
branch_labels = None
depends_on = None


def upgrade():
    # Füge Workflow-Tracking Felder hinzu
    op.add_column('reparaturen', sa.Column('begonnen_am', sa.DateTime(), nullable=True))
    op.add_column('reparaturen', sa.Column('prioritaet', sa.Integer(), nullable=True, server_default='3'))
    op.add_column('reparaturen', sa.Column('meister_zugewiesen', sa.String(length=100), nullable=True))
    
    # Setze begonnen_am für alle Reparaturen die bereits in_arbeit sind
    op.execute("""
        UPDATE reparaturen 
        SET begonnen_am = reparaturdatum
        WHERE status IN ('in_arbeit', 'fertig', 'abgeholt')
        AND begonnen_am IS NULL
    """)


def downgrade():
    op.drop_column('reparaturen', 'meister_zugewiesen')
    op.drop_column('reparaturen', 'prioritaet')
    op.drop_column('reparaturen', 'begonnen_am')
