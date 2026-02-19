/**
 * Shared subscription display logic – single source of truth for trial → subscription UX.
 * Use these states everywhere: banner, modal, subscription page, sidebar.
 */

export type SubscriptionApiStatus = "trial" | "active" | "expired" | "cancelled";

export type SubscriptionDisplayState =
  | "active"           // Paid, all good
  | "trial"            // Trial with >7 days left
  | "trial_ending_soon" // Trial, ≤7 days left
  | "trial_expired"    // Trial period ended (status may still be "trial", is_active false)
  | "expired"          // Paid period ended
  | "cancelled";       // User cancelled

export interface SubscriptionStatusFromApi {
  subscription_status: SubscriptionApiStatus;
  trial_ends_at?: string | null;
  subscription_ends_at?: string | null;
  days_remaining?: number | null;
  is_active?: boolean;
  monthly_price?: number;
}

/**
 * Derive a single display state from API response.
 * Handles backend not explicitly setting "expired" when trial/paid period ends.
 */
export function getSubscriptionDisplayState(
  s: SubscriptionStatusFromApi | null
): SubscriptionDisplayState {
  if (!s) return "trial";

  const status = s.subscription_status;
  const isActive = s.is_active === true;
  const daysRemaining = s.days_remaining ?? null;

  if (status === "cancelled") return "cancelled";

  if (status === "trial") {
    if (!isActive) return "trial_expired";
    if (daysRemaining !== null && daysRemaining <= 7) return "trial_ending_soon";
    return "trial";
  }

  if (status === "active") {
    if (!isActive) return "expired";
    return "active";
  }

  if (status === "expired") return "expired";

  return "trial";
}

/** Show the subscription banner (trial ending, expired, or cancelled). */
export function shouldShowSubscriptionBanner(state: SubscriptionDisplayState): boolean {
  return [
    "trial_ending_soon",
    "trial_expired",
    "expired",
    "cancelled",
  ].includes(state);
}

/** User has access (trial or paid). */
export function hasAccess(state: SubscriptionDisplayState): boolean {
  return ["active", "trial", "trial_ending_soon"].includes(state);
}

/** Show "Upgrade" / "Renew" as primary CTA (trial or expired). */
export function showUpgradeCta(state: SubscriptionDisplayState): boolean {
  return ["trial", "trial_ending_soon", "trial_expired", "expired"].includes(state);
}

/** Show "Reactivate" as primary CTA. */
export function showReactivateCta(state: SubscriptionDisplayState): boolean {
  return state === "cancelled";
}

/** Label for sidebar/badge. */
export function getSubscriptionBadgeLabel(state: SubscriptionDisplayState): string {
  switch (state) {
    case "active":
      return "Active";
    case "trial":
    case "trial_ending_soon":
      return "Trial";
    case "trial_expired":
    case "expired":
      return "Expired";
    case "cancelled":
      return "Cancelled";
    default:
      return "Trial";
  }
}
