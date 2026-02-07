"""add_vermietung_reservierung

Revision ID: 7d0e1f5e4f4h
Revises: 6c9d0e4d3e3g
Create Date: 2026-02-02 15:20:00

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '7d0e1f5e4f4h'
down_revision = '6c9d0e4d3e3g'
branch_labels = None
depends_on = None


def upgrade():
    # Erweitere VermietungStatus Enum um 'reserviert'
    op.execute("ALTER TYPE vermietungstatus ADD VALUE 'reserviert'")
    
    # Füge Reservierungs-Felder hinzu
    op.add_column('vermietungen', sa.Column('rad_abgeholt', sa.Boolean(), nullable=True, server_default='false'))
    op.add_column('vermietungen', sa.Column('abholzeit', sa.DateTime(), nullable=True))
    
    # Setze rad_abgeholt=true für alle bereits aktiven/abgeschlossenen Vermietungen
    op.execute("""
        UPDATE vermietungen 
        SET rad_abgeholt = true
        WHERE status IN ('aktiv', 'abgeschlossen')
        AND rad_abgeholt = false
    """)


def downgrade():
    op.drop_column('vermietungen', 'abholzeit')
    op.drop_column('vermietungen', 'rad_abgeholt')
    
    # Note: PostgreSQL doesn't support removing enum values easily
    # Would need to recreate the enum type to properly downgrade
