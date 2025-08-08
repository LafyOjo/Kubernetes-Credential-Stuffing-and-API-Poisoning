"""create security_state table

Revision ID: 0b9e06985bd8
Revises: fffff
Create Date: 2025-08-08 11:33:43.543013

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0b9e06985bd8'
down_revision: Union[str, None] = 'fffff'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "security_state",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("security_enabled", sa.Boolean(), nullable=False, server_default="1"),
        sa.Column("current_chain", sa.String(), nullable=True),
    )
    op.create_index(
        op.f("ix_security_state_id"),
        "security_state",
        ["id"],
        unique=False,
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_security_state_id"), table_name="security_state")
    op.drop_table("security_state")
