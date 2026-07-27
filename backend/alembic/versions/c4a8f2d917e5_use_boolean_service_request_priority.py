"""use boolean service request priority

Revision ID: c4a8f2d917e5
Revises: 9f3d2e6a1b40
Create Date: 2026-07-27

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c4a8f2d917e5"
down_revision: Union[str, Sequence[str], None] = "9f3d2e6a1b40"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "service_request_types",
        sa.Column(
            "is_high_priority",
            sa.Boolean(),
            server_default="false",
            nullable=False,
        ),
    )
    op.execute(
        """
        UPDATE service_request_types
        SET is_high_priority = true
        WHERE LOWER(priority) IN ('high', 'urgent')
        """
    )
    op.drop_column("service_request_types", "priority")


def downgrade() -> None:
    op.add_column(
        "service_request_types",
        sa.Column(
            "priority",
            sa.String(length=20),
            server_default="normal",
            nullable=False,
        ),
    )
    op.execute(
        """
        UPDATE service_request_types
        SET priority = 'urgent'
        WHERE is_high_priority = true
        """
    )
    op.drop_column("service_request_types", "is_high_priority")
