"""create_reparaturen

Revision ID: 3f6eb110f2d8
Revises: bf400957e8c7
Create Date: 2026-02-01 22:28:42.172074

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3f6eb110f2d8'
down_revision: Union[str, None] = 'bf400957e8c7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Reparaturen Tabelle
    op.create_table('reparaturen',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('auftragsnummer', sa.String(length=50), nullable=False),
        
        # Fahrrad
        sa.Column('fahrradmarke', sa.String(length=100), nullable=False),
        sa.Column('fahrradmodell', sa.String(length=100), nullable=True),
        sa.Column('rahmennummer', sa.String(length=100), nullable=True),
        sa.Column('schluesselnummer', sa.String(length=50), nullable=True),
        sa.Column('fahrrad_anwesend', sa.Boolean(), nullable=True, default=False),
        
        # Kunde
        sa.Column('kunde_name', sa.String(length=200), nullable=True),
        sa.Column('kunde_telefon', sa.String(length=50), nullable=True),
        sa.Column('kunde_email', sa.String(length=200), nullable=True),
        
        # Reparatur
        sa.Column('maengelbeschreibung', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        
        # Termine
        sa.Column('reparaturdatum', sa.DateTime(), nullable=False),
        sa.Column('fertig_bis', sa.DateTime(), nullable=True),
        sa.Column('fertig_am', sa.DateTime(), nullable=True),
        sa.Column('abholtermin', sa.String(length=100), nullable=True),
        sa.Column('abgeholt_am', sa.DateTime(), nullable=True),
        
        # Kosten
        sa.Column('kostenvoranschlag', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('endbetrag', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('bezahlt', sa.Boolean(), nullable=True, default=False),
        sa.Column('bezahlt_am', sa.DateTime(), nullable=True),
        
        # Notizen
        sa.Column('notizen', sa.Text(), nullable=True),
        
        # Timestamps
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_reparaturen_auftragsnummer'), 'reparaturen', ['auftragsnummer'], unique=True)
    op.create_index(op.f('ix_reparaturen_id'), 'reparaturen', ['id'], unique=False)
    op.create_index(op.f('ix_reparaturen_status'), 'reparaturen', ['status'], unique=False)
    
    # Reparatur Positionen Tabelle
    op.create_table('reparatur_positionen',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('reparatur_id', sa.Integer(), nullable=False),
        sa.Column('typ', sa.String(length=20), nullable=False),
        sa.Column('artikel_id', sa.Integer(), nullable=True),
        sa.Column('bezeichnung', sa.String(length=200), nullable=False),
        sa.Column('beschreibung', sa.Text(), nullable=True),
        sa.Column('menge', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('einzelpreis', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('gesamtpreis', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        
        sa.ForeignKeyConstraint(['artikel_id'], ['artikel.id'], ),
        sa.ForeignKeyConstraint(['reparatur_id'], ['reparaturen.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_reparatur_positionen_id'), 'reparatur_positionen', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_reparatur_positionen_id'), table_name='reparatur_positionen')
    op.drop_table('reparatur_positionen')
    
    op.drop_index(op.f('ix_reparaturen_status'), table_name='reparaturen')
    op.drop_index(op.f('ix_reparaturen_id'), table_name='reparaturen')
    op.drop_index(op.f('ix_reparaturen_auftragsnummer'), table_name='reparaturen')
    op.drop_table('reparaturen')
