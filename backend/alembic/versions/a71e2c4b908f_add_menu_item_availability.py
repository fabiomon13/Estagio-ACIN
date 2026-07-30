"""add menu item availability

Revision ID: a71e2c4b908f
Revises: c4a8f2d917e5
Create Date: 2026-07-27

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a71e2c4b908f"
down_revision: Union[str, Sequence[str], None] = "c4a8f2d917e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "menu_items",
        sa.Column(
            "is_available",
            sa.Boolean(),
            server_default="true",
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_column("menu_items", "is_available")
