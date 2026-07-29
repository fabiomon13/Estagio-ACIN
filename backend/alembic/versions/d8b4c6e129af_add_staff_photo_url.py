"""add staff photo url

Revision ID: d8b4c6e129af
Revises: a71e2c4b908f
Create Date: 2026-07-27

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d8b4c6e129af"
down_revision: Union[str, Sequence[str], None] = "a71e2c4b908f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "staff",
        sa.Column(
            "photo_url",
            sa.String(length=500),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("staff", "photo_url")
