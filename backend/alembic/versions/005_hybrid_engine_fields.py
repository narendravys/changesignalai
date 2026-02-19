"""Add hybrid engine fields to change_events

Revision ID: 005_hybrid_engine
Revises: 004_subscription_system
Create Date: 2026-02-19

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "005_hybrid_engine"
down_revision = "004_subscription_system"
branch_labels = None
depends_on = None


def upgrade():
    # JSONB is efficient in Postgres; use generic JSON type for portability
    op.add_column(
        "change_events",
        sa.Column("structured_diff", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column(
        "change_events",
        sa.Column("llm_analysis", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column(
        "change_events",
        sa.Column("requires_llm", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "change_events",
        sa.Column("confidence", sa.Float(), nullable=True),
    )

    # Indexes to support querying by severity_score and created_at already exist
    # via the model definition; ensure severity_score is indexed.
    op.create_index(
        "ix_change_events_severity_score",
        "change_events",
        ["severity_score"],
        unique=False,
    )


def downgrade():
    op.drop_index("ix_change_events_severity_score", table_name="change_events")
    op.drop_column("change_events", "confidence")
    op.drop_column("change_events", "requires_llm")
    op.drop_column("change_events", "llm_analysis")
    op.drop_column("change_events", "structured_diff")

