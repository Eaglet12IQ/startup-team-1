"""Switch chats PK from user_id to chat_id (per-project chats)

Revision ID: a1b2c3d4e5f6
Revises: 4f114bb1b71f
Create Date: 2026-05-26 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '4f114bb1b71f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('chats', sa.Column('chat_id', sa.Integer(), nullable=True))
    op.execute('UPDATE chats SET chat_id = user_id')
    op.alter_column('chats', 'chat_id', nullable=False)
    op.drop_index(op.f('ix_chats_user_id'), table_name='chats')
    op.drop_constraint('chats_pkey', 'chats', type_='primary')
    op.create_primary_key('chats_pkey', 'chats', ['chat_id'])
    op.create_index(op.f('ix_chats_chat_id'), 'chats', ['chat_id'], unique=False)
    op.create_index(op.f('ix_chats_user_id'), 'chats', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_chats_user_id'), table_name='chats')
    op.drop_index(op.f('ix_chats_chat_id'), table_name='chats')
    op.drop_constraint('chats_pkey', 'chats', type_='primary')
    op.create_primary_key('chats_pkey', 'chats', ['user_id'])
    op.create_index(op.f('ix_chats_user_id'), 'chats', ['user_id'], unique=False)
    op.drop_column('chats', 'chat_id')
