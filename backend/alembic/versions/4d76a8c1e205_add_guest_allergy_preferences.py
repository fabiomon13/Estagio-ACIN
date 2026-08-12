"""add guest allergy preferences

Revision ID: 4d76a8c1e205
Revises: 8e8650602acc
Create Date: 2026-08-06
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "4d76a8c1e205"
down_revision: Union[str, Sequence[str], None] = "8e8650602acc"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "guests",
        sa.Column("allergy_preferences_completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_table(
        "guest_allergy_tags",
        sa.Column("guest_id", sa.Integer(), nullable=False),
        sa.Column("tag_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["guest_id"], ["guests.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tag_id"], ["tags.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("guest_id", "tag_id"),
    )


def downgrade() -> None:
    op.drop_table("guest_allergy_tags")
    op.drop_column("guests", "allergy_preferences_completed_at")
