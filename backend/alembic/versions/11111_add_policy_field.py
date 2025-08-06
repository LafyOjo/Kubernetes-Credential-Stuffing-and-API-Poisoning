"""add policy string to users and seed demo users

Revision ID: 11111
Revises: fffff
Create Date: 2025-07-06 01:00:00.000000
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '11111'
down_revision: Union[str, None] = 'fffff'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('users') as batch_op:
        batch_op.add_column(sa.Column('policy', sa.String(), nullable=False, server_default='NoSecurity'))
    # Seed demo users
    conn = op.get_bind()
    conn.execute(sa.text("UPDATE users SET policy='NoSecurity' WHERE username='alice'"))
    conn.execute(sa.text("UPDATE users SET policy='ZeroTrust' WHERE username='ben'"))


def downgrade() -> None:
    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_column('policy')
