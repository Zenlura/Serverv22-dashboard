"""
Migration: Bestellungen und Positionen Tabellen

Revision ID: create_bestellungen
Create Date: 2026-02-08

Erstellt:
- bestellungen Tabelle
- bestellpositionen Tabelle
- Erweitert lieferanten um bestellungen Relationship
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '13376bf44874'
down_revision = 'b15fca79705b'
branch_labels = None
depends_on = None


def upgrade():
    # Bestellungen Tabelle
    op.create_table(
        'bestellungen',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('bestellnummer', sa.String(length=50), nullable=False),
        sa.Column('lieferant_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='offen'),
        sa.Column('notizen', sa.Text(), nullable=True),
        sa.Column('gesamtsumme_ek', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('gesamtsumme_vk', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('erstellt_am', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('bestellt_am', sa.DateTime(timezone=True), nullable=True),
        sa.Column('geliefert_am', sa.DateTime(timezone=True), nullable=True),
        sa.Column('abgeschlossen_am', sa.DateTime(timezone=True), nullable=True),
        sa.Column('erstellt_von', sa.String(length=100), nullable=True),
        sa.Column('bestellt_von', sa.String(length=100), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['lieferant_id'], ['lieferanten.id'], ondelete='RESTRICT'),
    )
    
    # Indices
    op.create_index('ix_bestellungen_bestellnummer', 'bestellungen', ['bestellnummer'], unique=True)
    op.create_index('ix_bestellungen_lieferant_id', 'bestellungen', ['lieferant_id'])
    op.create_index('ix_bestellungen_status', 'bestellungen', ['status'])
    
    # Bestellpositionen Tabelle
    op.create_table(
        'bestellpositionen',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('bestellung_id', sa.Integer(), nullable=False),
        sa.Column('artikel_id', sa.Integer(), nullable=True),
        sa.Column('artikelnummer', sa.String(length=100), nullable=False),
        sa.Column('beschreibung', sa.Text(), nullable=False),
        sa.Column('etrto', sa.String(length=20), nullable=True),
        sa.Column('zoll_info', sa.String(length=50), nullable=True),
        sa.Column('menge_bestellt', sa.Integer(), nullable=False),
        sa.Column('menge_geliefert', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('einkaufspreis', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('verkaufspreis', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('summe_ek', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('summe_vk', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('vollstaendig_geliefert', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('zuletzt_geliefert_am', sa.DateTime(timezone=True), nullable=True),
        sa.Column('notizen', sa.Text(), nullable=True),
        sa.Column('erstellt_am', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['bestellung_id'], ['bestellungen.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['artikel_id'], ['artikel.id'], ondelete='SET NULL'),
    )
    
    # Index
    op.create_index('ix_bestellpositionen_bestellung_id', 'bestellpositionen', ['bestellung_id'])


def downgrade():
    # Tabellen löschen (Reihenfolge wichtig wegen Foreign Keys)
    op.drop_index('ix_bestellpositionen_bestellung_id', table_name='bestellpositionen')
    op.drop_table('bestellpositionen')
    
    op.drop_index('ix_bestellungen_status', table_name='bestellungen')
    op.drop_index('ix_bestellungen_lieferant_id', table_name='bestellungen')
    op.drop_index('ix_bestellungen_bestellnummer', table_name='bestellungen')
    op.drop_table('bestellungen')
