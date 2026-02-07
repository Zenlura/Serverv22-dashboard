"""add_artikel_typ

Revision ID: 5b8c9d0e3c2f
Revises: 4a7c8d9e2b1f
Create Date: 2026-02-02 15:00:00

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '5b8c9d0e3c2f'
down_revision = '4a7c8d9e2b1f'
branch_labels = None
depends_on = None


def upgrade():
    # Erstelle ENUM Type
    op.execute("CREATE TYPE artikeltyp AS ENUM ('material', 'dienstleistung', 'werkzeug', 'sonstiges')")
    
    # Füge typ Spalte hinzu mit Default 'material'
    op.add_column('artikel', sa.Column('typ', sa.Enum('material', 'dienstleistung', 'werkzeug', 'sonstiges', name='artikeltyp'), nullable=False, server_default='material'))
    
    # Auto-Klassifikation: Dienstleistungen erkennen
    op.execute("""
        UPDATE artikel 
        SET typ = 'dienstleistung' 
        WHERE 
            LOWER(bezeichnung) LIKE '%einstellen%' OR
            LOWER(bezeichnung) LIKE '%prüfen%' OR
            LOWER(bezeichnung) LIKE '%warten%' OR
            LOWER(bezeichnung) LIKE '%wartung%' OR
            LOWER(bezeichnung) LIKE '%reparieren%' OR
            LOWER(bezeichnung) LIKE '%reparatur%' OR
            LOWER(bezeichnung) LIKE '%montieren%' OR
            LOWER(bezeichnung) LIKE '%demontieren%' OR
            LOWER(bezeichnung) LIKE '%kontrolle%' OR
            LOWER(bezeichnung) LIKE '%service%' OR
            LOWER(bezeichnung) LIKE '%inspektion%' OR
            LOWER(bezeichnung) LIKE '%arbeitsstunde%' OR
            LOWER(bezeichnung) LIKE '%arbeitszeit%' OR
            LOWER(bezeichnung) LIKE '%stundenlohn%'
    """)
    
    # Auto-Klassifikation: Werkzeuge erkennen
    op.execute("""
        UPDATE artikel 
        SET typ = 'werkzeug' 
        WHERE 
            LOWER(bezeichnung) LIKE '%schlüssel%' OR
            LOWER(bezeichnung) LIKE '%zange%' OR
            LOWER(bezeichnung) LIKE '%hammer%' OR
            LOWER(bezeichnung) LIKE '%schraubendreher%' OR
            LOWER(bezeichnung) LIKE '%pumpe%' OR
            LOWER(bezeichnung) LIKE '%montageständer%' OR
            LOWER(bezeichnung) LIKE '%werkzeug%'
    """)


def downgrade():
    op.drop_column('artikel', 'typ')
    op.execute("DROP TYPE IF EXISTS artikeltyp")
