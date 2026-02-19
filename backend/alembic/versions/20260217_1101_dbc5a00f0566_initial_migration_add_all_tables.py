"""Initial migration: add all base tables (organizations, users, competitors, monitored_pages, snapshots, change_events, alerts)

Revision ID: dbc5a00f0566
Revises:
Create Date: 2026-02-17 11:01:58.521822+00:00

Runs first. Then 003 (engagement), 004 (subscription), 005 (hybrid engine) run in sequence.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "dbc5a00f0566"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enum types (used by monitored_pages, change_events, alerts)
    op.execute(
        "DO $$ BEGIN CREATE TYPE check_frequency_enum AS ENUM ('hourly', 'daily', 'weekly'); EXCEPTION WHEN duplicate_object THEN null; END $$"
    )
    op.execute(
        "DO $$ BEGIN CREATE TYPE change_type_enum AS ENUM ('pricing', 'features', 'policy', 'content', 'layout', 'other'); EXCEPTION WHEN duplicate_object THEN null; END $$"
    )
    op.execute(
        "DO $$ BEGIN CREATE TYPE severity_enum AS ENUM ('low', 'medium', 'high', 'critical'); EXCEPTION WHEN duplicate_object THEN null; END $$"
    )
    op.execute(
        "DO $$ BEGIN CREATE TYPE alert_channel_enum AS ENUM ('email', 'slack', 'webhook'); EXCEPTION WHEN duplicate_object THEN null; END $$"
    )
    op.execute(
        "DO $$ BEGIN CREATE TYPE alert_status_enum AS ENUM ('pending', 'sent', 'failed', 'retry'); EXCEPTION WHEN duplicate_object THEN null; END $$"
    )

    # 1. Organizations (no subscription columns; 004 adds trial_period_days, monthly_price)
    op.create_table(
        "organizations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("max_competitors", sa.Integer(), server_default=sa.text("10"), nullable=False),
        sa.Column("max_monitored_pages", sa.Integer(), server_default=sa.text("50"), nullable=False),
        sa.Column("contact_email", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_organizations_id", "organizations", ["id"], unique=False)
    op.create_index("ix_organizations_name", "organizations", ["name"], unique=True)
    op.create_index("ix_organizations_slug", "organizations", ["slug"], unique=True)

    # 2. Users (no subscription columns; 004 adds is_admin, subscription_status, trial_ends_at, etc.)
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("is_superuser", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("last_login", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_id", "users", ["id"], unique=False)
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_users_organization_id", "users", ["organization_id"], unique=False)

    # 3. Competitors
    op.create_table(
        "competitors",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("domain", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("logo_url", sa.String(500), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_competitors_id", "competitors", ["id"], unique=False)
    op.create_index("ix_competitors_name", "competitors", ["name"], unique=False)
    op.create_index("ix_competitors_organization_id", "competitors", ["organization_id"], unique=False)

    # 4. Monitored pages
    op.create_table(
        "monitored_pages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("url", sa.String(1000), nullable=False),
        sa.Column("page_title", sa.String(500), nullable=True),
        sa.Column("page_type", sa.String(100), nullable=True),
        sa.Column("check_frequency", postgresql.ENUM("hourly", "daily", "weekly", name="check_frequency_enum", create_type=False), server_default=sa.text("'daily'::check_frequency_enum"), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("competitor_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("last_checked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("next_check_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["competitor_id"], ["competitors.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_monitored_pages_id", "monitored_pages", ["id"], unique=False)
    op.create_index("ix_monitored_pages_competitor_id", "monitored_pages", ["competitor_id"], unique=False)

    # 5. Snapshots
    op.create_table(
        "snapshots",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("raw_html", sa.Text(), nullable=True),
        sa.Column("cleaned_text", sa.Text(), nullable=True),
        sa.Column("screenshot_url", sa.String(1000), nullable=True),
        sa.Column("page_title", sa.String(500), nullable=True),
        sa.Column("http_status_code", sa.Integer(), nullable=True),
        sa.Column("content_hash", sa.String(64), nullable=True),
        sa.Column("success", sa.Boolean(), server_default=sa.true(), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("load_time_ms", sa.Integer(), nullable=True),
        sa.Column("page_size_bytes", sa.Integer(), nullable=True),
        sa.Column("monitored_page_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["monitored_page_id"], ["monitored_pages.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_snapshots_id", "snapshots", ["id"], unique=False)
    op.create_index("ix_snapshots_content_hash", "snapshots", ["content_hash"], unique=False)
    op.create_index("ix_snapshots_monitored_page_id", "snapshots", ["monitored_page_id"], unique=False)
    op.create_index("ix_snapshots_created_at", "snapshots", ["created_at"], unique=False)

    # 6. Change events (base columns only; 005 adds structured_diff, llm_analysis, requires_llm, confidence)
    op.create_table(
        "change_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("change_detected", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("change_type", postgresql.ENUM("pricing", "features", "policy", "content", "layout", "other", name="change_type_enum", create_type=False), server_default=sa.text("'other'::change_type_enum"), nullable=False),
        sa.Column("severity", postgresql.ENUM("low", "medium", "high", "critical", name="severity_enum", create_type=False), server_default=sa.text("'low'::severity_enum"), nullable=False),
        sa.Column("severity_score", sa.Integer(), server_default=sa.text("1"), nullable=False),
        sa.Column("business_impact", sa.Text(), nullable=True),
        sa.Column("recommended_action", sa.Text(), nullable=True),
        sa.Column("llm_response", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("diff_preview", sa.Text(), nullable=True),
        sa.Column("monitored_page_id", sa.Integer(), nullable=False),
        sa.Column("snapshot_id", sa.Integer(), nullable=False),
        sa.Column("acknowledged", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("acknowledged_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("acknowledged_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["monitored_page_id"], ["monitored_pages.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["snapshot_id"], ["snapshots.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_change_events_id", "change_events", ["id"], unique=False)
    op.create_index("ix_change_events_change_type", "change_events", ["change_type"], unique=False)
    op.create_index("ix_change_events_severity", "change_events", ["severity"], unique=False)
    op.create_index("ix_change_events_monitored_page_id", "change_events", ["monitored_page_id"], unique=False)
    op.create_index("ix_change_events_snapshot_id", "change_events", ["snapshot_id"], unique=False)
    op.create_index("ix_change_events_created_at", "change_events", ["created_at"], unique=False)

    # 7. Alerts
    op.create_table(
        "alerts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("channel", postgresql.ENUM("email", "slack", "webhook", name="alert_channel_enum", create_type=False), nullable=False),
        sa.Column("status", postgresql.ENUM("pending", "sent", "failed", "retry", name="alert_status_enum", create_type=False), server_default=sa.text("'pending'::alert_status_enum"), nullable=False),
        sa.Column("recipient", sa.String(500), nullable=True),
        sa.Column("subject", sa.String(500), nullable=True),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("retry_count", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("max_retries", sa.Integer(), server_default=sa.text("3"), nullable=False),
        sa.Column("response_data", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("change_event_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("next_retry_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["change_event_id"], ["change_events.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_alerts_id", "alerts", ["id"], unique=False)
    op.create_index("ix_alerts_channel", "alerts", ["channel"], unique=False)
    op.create_index("ix_alerts_status", "alerts", ["status"], unique=False)
    op.create_index("ix_alerts_change_event_id", "alerts", ["change_event_id"], unique=False)


def downgrade() -> None:
    # Drop in reverse order of creation (alerts -> change_events -> snapshots -> monitored_pages -> competitors -> users -> organizations)
    op.drop_index("ix_alerts_change_event_id", table_name="alerts")
    op.drop_index("ix_alerts_status", table_name="alerts")
    op.drop_index("ix_alerts_channel", table_name="alerts")
    op.drop_index("ix_alerts_id", table_name="alerts")
    op.drop_table("alerts")

    op.drop_index("ix_change_events_created_at", table_name="change_events")
    op.drop_index("ix_change_events_snapshot_id", table_name="change_events")
    op.drop_index("ix_change_events_monitored_page_id", table_name="change_events")
    op.drop_index("ix_change_events_severity", table_name="change_events")
    op.drop_index("ix_change_events_change_type", table_name="change_events")
    op.drop_index("ix_change_events_id", table_name="change_events")
    op.drop_table("change_events")

    op.drop_index("ix_snapshots_created_at", table_name="snapshots")
    op.drop_index("ix_snapshots_monitored_page_id", table_name="snapshots")
    op.drop_index("ix_snapshots_content_hash", table_name="snapshots")
    op.drop_index("ix_snapshots_id", table_name="snapshots")
    op.drop_table("snapshots")

    op.drop_index("ix_monitored_pages_competitor_id", table_name="monitored_pages")
    op.drop_index("ix_monitored_pages_id", table_name="monitored_pages")
    op.drop_table("monitored_pages")

    op.drop_index("ix_competitors_organization_id", table_name="competitors")
    op.drop_index("ix_competitors_name", table_name="competitors")
    op.drop_index("ix_competitors_id", table_name="competitors")
    op.drop_table("competitors")

    op.drop_index("ix_users_organization_id", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_index("ix_users_id", table_name="users")
    op.drop_table("users")

    op.drop_index("ix_organizations_slug", table_name="organizations")
    op.drop_index("ix_organizations_name", table_name="organizations")
    op.drop_index("ix_organizations_id", table_name="organizations")
    op.drop_table("organizations")

    op.execute("DROP TYPE IF EXISTS alert_status_enum")
    op.execute("DROP TYPE IF EXISTS alert_channel_enum")
    op.execute("DROP TYPE IF EXISTS severity_enum")
    op.execute("DROP TYPE IF EXISTS change_type_enum")
    op.execute("DROP TYPE IF EXISTS check_frequency_enum")
