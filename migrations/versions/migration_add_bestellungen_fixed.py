"""Add bestellungen and bestellpositionen tables

Revision ID: add_bestellungen
Revises: 24b75d94edfe
Create Date: 2026-02-01 18:00:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'add_bestellungen'
down_revision: Union[str, None] = '24b75d94edfe'  # ← DEINE LETZTE MIGRATION
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # BestellStatus Enum erstellen
    bestellstatus_enum = postgresql.ENUM(
        'entwurf', 'bestellt', 'teilgeliefert', 'geliefert', 'storniert',
        name='bestellstatus',
        create_type=False
    )
    bestellstatus_enum.create(op.get_bind(), checkfirst=True)
    
    # Tabelle: bestellungen
    op.create_table(
        'bestellungen',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('bestellnummer', sa.String(length=50), nullable=False),
        sa.Column('lieferant_id', sa.Integer(), nullable=False),
        sa.Column('status', bestellstatus_enum, nullable=False, server_default='entwurf'),
        sa.Column('bestelldatum', sa.DateTime(timezone=True), nullable=True),
        sa.Column('lieferdatum_erwartet', sa.DateTime(timezone=True), nullable=True),
        sa.Column('lieferdatum_tatsaechlich', sa.DateTime(timezone=True), nullable=True),
        sa.Column('gesamtpreis', sa.Numeric(precision=10, scale=2), nullable=False, server_default='0.0'),
        sa.Column('versandkosten', sa.Numeric(precision=10, scale=2), nullable=False, server_default='0.0'),
        sa.Column('notizen', sa.Text(), nullable=True),
        sa.Column('interne_notizen', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['lieferant_id'], ['lieferanten.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_bestellungen_id'), 'bestellungen', ['id'], unique=False)
    op.create_index(op.f('ix_bestellungen_bestellnummer'), 'bestellungen', ['bestellnummer'], unique=True)
    
    # Tabelle: bestellpositionen
    op.create_table(
        'bestellpositionen',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('bestellung_id', sa.Integer(), nullable=False),
        sa.Column('artikel_id', sa.Integer(), nullable=False),
        sa.Column('menge', sa.Integer(), nullable=False),
        sa.Column('einzelpreis', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('gesamtpreis', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('menge_geliefert', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('geliefert', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('notizen', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['artikel_id'], ['artikel.id'], ),
        sa.ForeignKeyConstraint(['bestellung_id'], ['bestellungen.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_bestellpositionen_id'), 'bestellpositionen', ['id'], unique=False)


def downgrade() -> None:
    # Tabellen löschen
    op.drop_index(op.f('ix_bestellpositionen_id'), table_name='bestellpositionen')
    op.drop_table('bestellpositionen')
    
    op.drop_index(op.f('ix_bestellungen_bestellnummer'), table_name='bestellungen')
    op.drop_index(op.f('ix_bestellungen_id'), table_name='bestellungen')
    op.drop_table('bestellungen')
    
    # Enum löschen
    bestellstatus_enum = postgresql.ENUM(name='bestellstatus')
    bestellstatus_enum.drop(op.get_bind(), checkfirst=True)
