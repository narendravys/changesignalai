"""Add password reset fields to users

Revision ID: 007_password_reset
Revises: 006_human_comparison
Create Date: 2026-02-21

"""
from alembic import op
import sqlalchemy as sa

revision = "007_password_reset"
down_revision = "006_human_comparison"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("password_reset_token", sa.String(255), nullable=True))
    op.add_column("users", sa.Column("password_reset_expires", sa.DateTime(timezone=True), nullable=True))


def downgrade():
    op.drop_column("users", "password_reset_expires")
    op.drop_column("users", "password_reset_token")
