"""
Artikel Varianten System

Fügt hinzu:
1. artikel_varianten Tabelle
2. hat_varianten Flag in artikel Tabelle

Revision ID: varianten_system_001
Revises: 
Create Date: 2026-02-08 20:30:00
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = 'varianten_system_001'
down_revision = None  # Setze hier die letzte Migration ID ein!
branch_labels = None
depends_on = None


def upgrade():
    # 1. Erweitere artikel Tabelle um hat_varianten
    op.add_column('artikel', sa.Column('hat_varianten', sa.Boolean(), nullable=False, server_default='false'))
    
    # 2. Erstelle artikel_varianten Tabelle
    op.create_table('artikel_varianten',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('artikel_id', sa.Integer(), nullable=False),
        
        # Identifikation
        sa.Column('artikelnummer', sa.String(length=50), nullable=False),
        sa.Column('barcode', sa.String(length=100), nullable=True),
        
        # Spezifikation
        sa.Column('etrto', sa.String(length=20), nullable=True),
        sa.Column('zoll_info', sa.String(length=50), nullable=True),
        sa.Column('farbe', sa.String(length=50), nullable=True),
        
        # Bestand
        sa.Column('bestand_lager', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('bestand_werkstatt', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('mindestbestand', sa.Integer(), nullable=False, server_default='0'),
        
        # Preise
        sa.Column('preis_ek', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('preis_ek_rabattiert', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('preis_uvp', sa.Numeric(precision=10, scale=2), nullable=False),
        
        # Lager (für später)
        sa.Column('lagerort_id', sa.Integer(), nullable=True),
        
        # Meta
        sa.Column('notizen', sa.Text(), nullable=True),
        sa.Column('aktiv', sa.Boolean(), nullable=False, server_default='true'),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        
        # Constraints
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['artikel_id'], ['artikel.id'], ondelete='CASCADE'),
        # sa.ForeignKeyConstraint(['lagerort_id'], ['lagerorte.id'], ondelete='SET NULL'),  # Später aktivieren
    )
    
    # 3. Indices erstellen
    op.create_index('ix_artikel_varianten_artikel_id', 'artikel_varianten', ['artikel_id'])
    op.create_index('ix_artikel_varianten_artikelnummer', 'artikel_varianten', ['artikelnummer'])
    op.create_index('ix_artikel_varianten_barcode', 'artikel_varianten', ['barcode'])


def downgrade():
    # Indices löschen
    op.drop_index('ix_artikel_varianten_barcode', table_name='artikel_varianten')
    op.drop_index('ix_artikel_varianten_artikelnummer', table_name='artikel_varianten')
    op.drop_index('ix_artikel_varianten_artikel_id', table_name='artikel_varianten')
    
    # Tabelle löschen
    op.drop_table('artikel_varianten')
    
    # Spalte aus artikel entfernen
    op.drop_column('artikel', 'hat_varianten')
