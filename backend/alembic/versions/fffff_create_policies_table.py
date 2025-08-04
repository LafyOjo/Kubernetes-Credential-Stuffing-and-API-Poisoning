"""create policies table and add policy_id to users

Revision ID: fffff
Revises: eeeee
Create Date: 2025-07-06 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'fffff'
down_revision: Union[str, None] = 'eeeee'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'policies',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('failed_attempts_limit', sa.Integer(), nullable=False),
        sa.Column('mfa_required', sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column('geo_fencing_enabled', sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_index(op.f('ix_policies_id'), 'policies', ['id'], unique=False)

    op.add_column('users', sa.Column('policy_id', sa.Integer(), nullable=True))
    op.create_foreign_key('users_policy_id_fkey', 'users', 'policies', ['policy_id'], ['id'])
    op.create_index(op.f('ix_users_policy_id'), 'users', ['policy_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_users_policy_id'), table_name='users')
    op.drop_constraint('users_policy_id_fkey', 'users', type_='foreignkey')
    op.drop_column('users', 'policy_id')

    op.drop_index(op.f('ix_policies_id'), table_name='policies')
    op.drop_table('policies')
