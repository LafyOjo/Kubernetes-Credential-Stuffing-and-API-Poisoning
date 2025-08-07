"""drop role and policy columns from users

Revision ID: d71eb047c7d3
Revises: fbf89aca26c7
Create Date: 2025-08-07 13:38:08.780943

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd71eb047c7d3'
down_revision: Union[str, None] = '11111'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('users') as batch_op:
        batch_op.drop_column('role')
        batch_op.drop_column('policy_id')
        batch_op.drop_column('policy')


def downgrade() -> None:
    with op.batch_alter_table('users') as batch_op:
        batch_op.add_column(sa.Column('role', sa.String(), nullable=False, server_default='user'))
        batch_op.add_column(sa.Column('policy_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('policy', sa.String(), nullable=False, server_default='NoSecurity'))
        batch_op.create_foreign_key('fk_users_policy_id_policies', 'policies', ['policy_id'], ['id'])
