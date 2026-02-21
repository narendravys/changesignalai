/**
 * TypeScript types for ChangeSignal
 */

export interface User {
  id: number;
  email: string;
  full_name?: string;
  organization_id: number;
  organization?: {
    id: number;
    name: string;
    slug: string;
  };
  is_active: boolean;
  is_superuser: boolean;
  is_admin: boolean;
  subscription_status: "trial" | "active" | "expired" | "cancelled";
  trial_ends_at?: string;
  subscription_ends_at?: string;
  created_at: string;
  last_login?: string;
}

export interface Organization {
  id: number;
  name: string;
  slug: string;
  description?: string;
  is_active: boolean;
  max_competitors: number;
  max_monitored_pages: number;
  contact_email?: string;
  created_at: string;
}

export interface Competitor {
  id: number;
  name: string;
  domain: string;
  description?: string;
  logo_url?: string;
  is_active: boolean;
  organization_id: number;
  created_at: string;
  updated_at: string;
  monitored_pages_count?: number;
}

export interface MonitoredPage {
  id: number;
  url: string;
  page_title?: string;
  page_type?: string;
  check_frequency: "hourly" | "daily" | "weekly";
  is_active: boolean;
  competitor_id: number;
  competitor_name?: string;
  competitor_domain?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  last_checked_at?: string;
  next_check_at?: string;
}

export interface ChangeEvent {
  id: number;
  monitored_page_id: number;
  snapshot_id: number;
  change_detected: boolean;
  summary: string;
  change_type: "pricing" | "features" | "policy" | "content" | "layout" | "other";
  severity: "low" | "medium" | "high" | "critical";
  severity_score: number;
  business_impact: string;
  recommended_action: string;
  human_readable_comparison?: string;
  diff_preview?: string;
  llm_response?: any;
  acknowledged: boolean;
  acknowledged_at?: string;
  created_at: string;
  page_url?: string;
  competitor_name?: string;
  snapshot_has_screenshot?: boolean;
}

export interface ChangeSummary {
  period_days: number;
  total_changes: number;
  by_severity: Record<string, number>;
  by_type: Record<string, number>;
  unacknowledged: number;
  date_from: string;
  date_to: string;
}
