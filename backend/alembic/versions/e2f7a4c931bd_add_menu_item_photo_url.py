"""add menu item photo url

Revision ID: e2f7a4c931bd
Revises: d8b4c6e129af
Create Date: 2026-07-27

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e2f7a4c931bd"
down_revision: Union[str, Sequence[str], None] = "d8b4c6e129af"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "menu_items",
        sa.Column(
            "photo_url",
            sa.String(length=500),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("menu_items", "photo_url")
