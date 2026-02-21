"use client";

import { useMemo } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  getSubscriptionDisplayState,
  getSubscriptionBadgeLabel,
  hasAccess,
  type SubscriptionStatusFromApi,
} from "@/lib/subscription";
import { useState, useEffect } from "react";

interface SubscriptionStatusBadgeProps {
  /** When provided (e.g. from Layout), no separate API call is made. */
  subscriptionStatus?: SubscriptionStatusFromApi | null;
}

export default function SubscriptionStatusBadge({ subscriptionStatus: statusFromParent }: SubscriptionStatusBadgeProps) {
  const [selfStatus, setSelfStatus] = useState<SubscriptionStatusFromApi | null>(null);
  const status = statusFromParent ?? selfStatus;

  useEffect(() => {
    if (statusFromParent !== undefined) return;
    let mounted = true;
    api
      .getSubscriptionStatus()
      .then((s) => { if (mounted) setSelfStatus(s); })
      .catch(() => { if (mounted) setSelfStatus(null); });
    return () => { mounted = false; };
  }, [statusFromParent]);

  const state = useMemo(() => getSubscriptionDisplayState(status), [status]);
  if (status === null) return null;
  const label = getSubscriptionBadgeLabel(state);
  const access = hasAccess(state);

  const bg = access
    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
    : "bg-amber-50 border-amber-200 text-amber-800";

  return (
    <Link
      href="/subscription"
      className={`block p-2.5 rounded-lg border text-xs font-medium ${bg} hover:opacity-90 transition-opacity`}
    >
      Plan: {label}
    </Link>
  );
}
