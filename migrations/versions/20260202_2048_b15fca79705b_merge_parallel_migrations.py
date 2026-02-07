"""merge parallel migrations

Revision ID: b15fca79705b
Revises: db0a5e13925f, f7eea1ac9f57
Create Date: 2026-02-02 20:48:46.194710

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b15fca79705b'
down_revision: Union[str, None] = ('db0a5e13925f', 'f7eea1ac9f57')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
