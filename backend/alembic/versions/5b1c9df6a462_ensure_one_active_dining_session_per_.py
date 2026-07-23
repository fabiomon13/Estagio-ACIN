"""ensure one active dining session per table

Revision ID: 5b1c9df6a462
Revises: a1249b89c2c1
Create Date: 2026-07-23 09:24:47.273808

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5b1c9df6a462'
down_revision: Union[str, Sequence[str], None] = 'a1249b89c2c1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
