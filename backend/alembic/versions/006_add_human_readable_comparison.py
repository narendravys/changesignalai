"""Add human_readable_comparison to change_events

Revision ID: 006_human_comparison
Revises: 005_hybrid_engine
Create Date: 2026-02-20

"""
from alembic import op
import sqlalchemy as sa

revision = "006_human_comparison"
down_revision = "005_hybrid_engine"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "change_events",
        sa.Column("human_readable_comparison", sa.Text(), nullable=True),
    )


def downgrade():
    op.drop_column("change_events", "human_readable_comparison")
