"""add service request types

Revision ID: 9f3d2e6a1b40
Revises: 5c1a24815d68
Create Date: 2026-07-27

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "9f3d2e6a1b40"
down_revision: Union[str, Sequence[str], None] = "5c1a24815d68"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "service_request_types",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("alias", sa.String(length=100), nullable=False),
        sa.Column(
            "priority",
            sa.String(length=20),
            server_default="normal",
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_service_request_types_name"),
        "service_request_types",
        ["name"],
        unique=True,
    )
    op.create_index(
        op.f("ix_service_request_types_alias"),
        "service_request_types",
        ["alias"],
        unique=True,
    )

    # Preserva os tipos e prioridades dos pedidos que já possam existir.
    op.execute(
        """
        INSERT INTO service_request_types (name, alias, priority)
        SELECT DISTINCT
            type,
            LOWER(
                REGEXP_REPLACE(
                    TRIM(type),
                    '[^a-zA-Z0-9_]+',
                    '_',
                    'g'
                )
            ),
            priority
        FROM service_requests
        ON CONFLICT DO NOTHING
        """
    )

    op.add_column(
        "service_requests",
        sa.Column("type_id", sa.Integer(), nullable=True),
    )
    op.execute(
        """
        UPDATE service_requests AS service_request
        SET type_id = request_type.id
        FROM service_request_types AS request_type
        WHERE request_type.alias = LOWER(
            REGEXP_REPLACE(
                TRIM(service_request.type),
                '[^a-zA-Z0-9_]+',
                '_',
                'g'
            )
        )
        """
    )
    op.alter_column(
        "service_requests",
        "type_id",
        existing_type=sa.Integer(),
        nullable=False,
    )
    op.create_index(
        op.f("ix_service_requests_type_id"),
        "service_requests",
        ["type_id"],
        unique=False,
    )
    op.create_foreign_key(
        op.f("service_requests_type_id_fkey"),
        "service_requests",
        "service_request_types",
        ["type_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.drop_column("service_requests", "priority")
    op.drop_column("service_requests", "type")


def downgrade() -> None:
    op.add_column(
        "service_requests",
        sa.Column("type", sa.String(length=50), nullable=True),
    )
    op.add_column(
        "service_requests",
        sa.Column(
            "priority",
            sa.String(length=20),
            server_default="normal",
            nullable=True,
        ),
    )
    op.execute(
        """
        UPDATE service_requests AS service_request
        SET
            type = request_type.alias,
            priority = request_type.priority
        FROM service_request_types AS request_type
        WHERE request_type.id = service_request.type_id
        """
    )
    op.alter_column(
        "service_requests",
        "type",
        existing_type=sa.String(length=50),
        nullable=False,
    )
    op.alter_column(
        "service_requests",
        "priority",
        existing_type=sa.String(length=20),
        nullable=False,
    )
    op.drop_constraint(
        op.f("service_requests_type_id_fkey"),
        "service_requests",
        type_="foreignkey",
    )
    op.drop_index(
        op.f("ix_service_requests_type_id"),
        table_name="service_requests",
    )
    op.drop_column("service_requests", "type_id")
    op.drop_index(
        op.f("ix_service_request_types_alias"),
        table_name="service_request_types",
    )
    op.drop_index(
        op.f("ix_service_request_types_name"),
        table_name="service_request_types",
    )
    op.drop_table("service_request_types")
