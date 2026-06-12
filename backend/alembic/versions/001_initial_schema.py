"""Initial schema - users and scans tables

Revision ID: 001_initial
Revises:
Create Date: 2026-06-12
"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )

    op.create_table(
        "scans",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id"), nullable=False, index=True),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("original_image", sa.String(255), nullable=False),
        sa.Column("result_image", sa.String(255), nullable=False),
        sa.Column("acne_count", sa.Integer, server_default="0"),
        sa.Column("severity", sa.String(50), nullable=False),
        sa.Column("confidence", sa.Float, server_default="0.0"),
        sa.Column("spot_types", sa.Text, server_default="{}"),
        sa.Column("pigmentation_data", sa.Text, server_default="{}"),
        sa.Column("dryness_data", sa.Text, server_default="{}"),
        sa.Column("recommendations", sa.Text, server_default="[]"),
        sa.Column("conflicts", sa.Text, server_default="[]"),
        sa.Column("routine", sa.Text, server_default="{}"),
        sa.Column("face_quality", sa.Text, server_default="{}"),
    )
    op.create_index("ix_scans_user_created", "scans", ["user_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_scans_user_created", table_name="scans")
    op.drop_table("scans")
    op.drop_table("users")
