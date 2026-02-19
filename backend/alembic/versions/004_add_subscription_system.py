"""Add subscription system and admin features

Revision ID: 004_subscription_system
Revises: 003_engagement_features
Create Date: 2026-02-17

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '004_subscription_system'
down_revision = '003_engagement_features'
branch_labels = None
depends_on = None


def upgrade():
    # Create enum types using raw SQL (check if exists first)
    op.execute("DO $$ BEGIN CREATE TYPE subscriptionstatus AS ENUM ('trial', 'active', 'expired', 'cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$")
    op.execute("DO $$ BEGIN CREATE TYPE feedbackstatus AS ENUM ('open', 'in_progress', 'resolved', 'closed'); EXCEPTION WHEN duplicate_object THEN null; END $$")
    op.execute("DO $$ BEGIN CREATE TYPE feedbackpriority AS ENUM ('low', 'medium', 'high', 'critical'); EXCEPTION WHEN duplicate_object THEN null; END $$")
    
    # Add subscription fields to users table (idempotent: skip if column exists)
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false NOT NULL")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status subscriptionstatus DEFAULT 'trial'::subscriptionstatus NOT NULL")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMP WITH TIME ZONE")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255)")
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255)")
    
    # Add subscription configuration fields to organizations table
    op.execute("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS trial_period_days INTEGER DEFAULT 14 NOT NULL")
    op.execute("ALTER TABLE organizations ADD COLUMN IF NOT EXISTS monthly_price INTEGER DEFAULT 199 NOT NULL")
    
    # Create feedback table (idempotent: skip if exists)
    op.execute("""
        CREATE TABLE IF NOT EXISTS feedback (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            subject VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            category VARCHAR(50) NOT NULL,
            status feedbackstatus DEFAULT 'open'::feedbackstatus NOT NULL,
            priority feedbackpriority DEFAULT 'medium'::feedbackpriority NOT NULL,
            admin_notes TEXT,
            resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            resolved_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_feedback_id ON feedback (id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_feedback_user_id ON feedback (user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_feedback_status ON feedback (status)")


def downgrade():
    # Drop feedback table and indexes
    op.execute("DROP INDEX IF EXISTS ix_feedback_status")
    op.execute("DROP INDEX IF EXISTS ix_feedback_user_id")
    op.execute("DROP INDEX IF EXISTS ix_feedback_id")
    op.execute("DROP TABLE IF EXISTS feedback")
    
    # Remove organization subscription fields
    op.execute("ALTER TABLE organizations DROP COLUMN IF EXISTS monthly_price")
    op.execute("ALTER TABLE organizations DROP COLUMN IF EXISTS trial_period_days")
    
    # Remove user subscription fields
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS stripe_subscription_id")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS stripe_customer_id")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS subscription_ends_at")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS trial_ends_at")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS subscription_status")
    op.execute("ALTER TABLE users DROP COLUMN IF EXISTS is_admin")
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS feedbackpriority')
    op.execute('DROP TYPE IF EXISTS feedbackstatus')
    op.execute('DROP TYPE IF EXISTS subscriptionstatus')
