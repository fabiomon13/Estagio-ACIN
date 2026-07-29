"""align stations and tags with schema

Revision ID: 8e8650602acc
Revises: f5c8d1a742be
Create Date: 2026-07-29 13:42:39.674783
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "8e8650602acc"
down_revision: Union[str, Sequence[str], None] = "f5c8d1a742be"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Align stations and tags with the current models."""

    # Rename categories.station_id while preserving existing values.
    op.drop_index(
        "ix_categories_station_id",
        table_name="categories",
    )

    op.alter_column(
        "categories",
        "station_id",
        new_column_name="default_station_id",
        existing_type=sa.Integer(),
        existing_nullable=False,
    )

    op.create_index(
        "ix_categories_default_station_id",
        "categories",
        ["default_station_id"],
        unique=False,
    )

    # Add an optional station override to menu items.
    op.add_column(
        "menu_items",
        sa.Column(
            "station_id",
            sa.Integer(),
            nullable=True,
        ),
    )

    op.create_foreign_key(
        "fk_menu_items_station_id",
        "menu_items",
        "stations",
        ["station_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    op.create_index(
        "ix_menu_items_station_id",
        "menu_items",
        ["station_id"],
        unique=False,
    )

    # Add the tag description shown in the data model.
    op.add_column(
        "tags",
        sa.Column(
            "description",
            sa.Text(),
            nullable=True,
        ),
    )


def downgrade() -> None:
    """Restore the previous schema."""

    op.drop_column(
        "tags",
        "description",
    )

    op.drop_index(
        "ix_menu_items_station_id",
        table_name="menu_items",
    )

    op.drop_constraint(
        "fk_menu_items_station_id",
        "menu_items",
        type_="foreignkey",
    )

    op.drop_column(
        "menu_items",
        "station_id",
    )

    op.drop_index(
        "ix_categories_default_station_id",
        table_name="categories",
    )

    op.alter_column(
        "categories",
        "default_station_id",
        new_column_name="station_id",
        existing_type=sa.Integer(),
        existing_nullable=False,
    )

    op.create_index(
        "ix_categories_station_id",
        "categories",
        ["station_id"],
        unique=False,
    )