"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import {
  getSubscriptionDisplayState,
  getSubscriptionBadgeLabel,
  hasAccess,
} from "@/lib/subscription";

export default function SubscriptionStatusBadge() {
  const [state, setState] = useState<ReturnType<typeof getSubscriptionDisplayState> | null>(null);

  useEffect(() => {
    let mounted = true;
    api
      .getSubscriptionStatus()
      .then((status) => {
        if (mounted) setState(getSubscriptionDisplayState(status));
      })
      .catch(() => {
        if (mounted) setState(null);
      });
    return () => { mounted = false; };
  }, []);

  if (state === null) return null;

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
