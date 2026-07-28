"""add order idempotency

Revision ID: f5c8d1a742be
Revises: e2f7a4c931bd
Create Date: 2026-07-27

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f5c8d1a742be"
down_revision: Union[str, Sequence[str], None] = "e2f7a4c931bd"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "orders",
        sa.Column("client_request_id", sa.String(length=36), nullable=True),
    )
    op.execute(
        """
        UPDATE orders
        SET client_request_id = gen_random_uuid()::text
        WHERE client_request_id IS NULL
        """
    )
    op.alter_column(
        "orders",
        "client_request_id",
        existing_type=sa.String(length=36),
        nullable=False,
    )
    op.create_index(
        op.f("ix_orders_client_request_id"),
        "orders",
        ["client_request_id"],
        unique=True,
    )
    op.create_unique_constraint(
        "uq_orders_guest_round",
        "orders",
        ["guest_id", "round_number"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_orders_guest_round",
        "orders",
        type_="unique",
    )
    op.drop_index(
        op.f("ix_orders_client_request_id"),
        table_name="orders",
    )
    op.drop_column("orders", "client_request_id")
