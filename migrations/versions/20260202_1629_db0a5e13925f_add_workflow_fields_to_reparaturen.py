"""add_workflow_fields_to_reparaturen

Revision ID: db0a5e13925f
Revises: b5ea4ffd06eb
Create Date: 2026-02-02 16:29:34.642291

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'db0a5e13925f'
down_revision: Union[str, None] = 'b5ea4ffd06eb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
