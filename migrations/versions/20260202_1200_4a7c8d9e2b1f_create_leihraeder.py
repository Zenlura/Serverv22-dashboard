"""create_leihraeder_vermietungen

Revision ID: 4a7c8d9e2b1f
Revises: 3f6eb110f2d8
Create Date: 2026-02-02 12:00:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '4a7c8d9e2b1f'
down_revision = '3f6eb110f2d8'
branch_labels = None
depends_on = None


def upgrade():
    # Leihräder Tabelle
    op.create_table('leihraeder',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('inventarnummer', sa.String(length=50), nullable=False),
        sa.Column('marke', sa.String(length=100), nullable=False),
        sa.Column('modell', sa.String(length=100), nullable=True),
        sa.Column('rahmennummer', sa.String(length=100), nullable=True),
        sa.Column('farbe', sa.String(length=50), nullable=True),
        sa.Column('rahmenhoehe', sa.String(length=20), nullable=True),
        sa.Column('typ', sa.String(length=50), nullable=True),
        sa.Column('tagespreis', sa.Numeric(precision=10, scale=2), nullable=False, server_default='0'),
        sa.Column('wochenpreis', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('kaution', sa.Numeric(precision=10, scale=2), nullable=True, server_default='50.00'),
        sa.Column('status', sa.Enum('verfuegbar', 'verliehen', 'wartung', 'defekt', name='leihradstatus'), nullable=False, server_default='verfuegbar'),
        sa.Column('zustand', sa.Text(), nullable=True),
        sa.Column('angeschafft_am', sa.DateTime(), nullable=True),
        sa.Column('letzte_wartung', sa.DateTime(), nullable=True),
        sa.Column('naechste_wartung', sa.DateTime(), nullable=True),
        sa.Column('notizen', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_leihraeder_id'), 'leihraeder', ['id'], unique=False)
    op.create_index(op.f('ix_leihraeder_inventarnummer'), 'leihraeder', ['inventarnummer'], unique=True)

    # Vermietungen Tabelle
    op.create_table('vermietungen',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('leihrad_id', sa.Integer(), nullable=False),
        sa.Column('kunde_name', sa.String(length=200), nullable=False),
        sa.Column('kunde_telefon', sa.String(length=50), nullable=True),
        sa.Column('kunde_email', sa.String(length=200), nullable=True),
        sa.Column('kunde_adresse', sa.Text(), nullable=True),
        sa.Column('ausweis_typ', sa.String(length=50), nullable=True),
        sa.Column('ausweis_nummer', sa.String(length=100), nullable=True),
        sa.Column('von_datum', sa.Date(), nullable=False),
        sa.Column('bis_datum', sa.Date(), nullable=False),
        sa.Column('rueckgabe_datum', sa.Date(), nullable=True),
        sa.Column('tagespreis', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('anzahl_tage', sa.Integer(), nullable=False),
        sa.Column('gesamtpreis', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('kaution', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('kaution_zurueck', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('bezahlt', sa.Boolean(), nullable=True, server_default='false'),
        sa.Column('bezahlt_am', sa.DateTime(), nullable=True),
        sa.Column('status', sa.Enum('aktiv', 'abgeschlossen', 'storniert', name='vermietungstatus'), nullable=False, server_default='aktiv'),
        sa.Column('zustand_bei_ausgabe', sa.Text(), nullable=True),
        sa.Column('zustand_bei_rueckgabe', sa.Text(), nullable=True),
        sa.Column('schaeden', sa.Text(), nullable=True),
        sa.Column('erstellt_am', sa.DateTime(), nullable=True),
        sa.Column('notizen', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['leihrad_id'], ['leihraeder.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_vermietungen_id'), 'vermietungen', ['id'], unique=False)


def downgrade():
    op.drop_index(op.f('ix_vermietungen_id'), table_name='vermietungen')
    op.drop_table('vermietungen')
    op.drop_index(op.f('ix_leihraeder_inventarnummer'), table_name='leihraeder')
    op.drop_index(op.f('ix_leihraeder_id'), table_name='leihraeder')
    op.drop_table('leihraeder')
    
    # Drop ENUMs (PostgreSQL specific)
    op.execute("DROP TYPE IF EXISTS leihradstatus")
    op.execute("DROP TYPE IF EXISTS vermietungstatus")
