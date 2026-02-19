"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { FiAlertCircle, FiX, FiChevronRight } from "react-icons/fi";
import Link from "next/link";
import SubscriptionModal from "./SubscriptionModal";
import {
  getSubscriptionDisplayState,
  shouldShowSubscriptionBanner,
  type SubscriptionStatusFromApi,
} from "@/lib/subscription";

const SESSION_MODAL_KEY = "changesignal_subscription_modal_shown";

export default function SubscriptionBanner() {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatusFromApi | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadSubscriptionStatus();
  }, []);

  const loadSubscriptionStatus = async () => {
    try {
      const status = await api.getSubscriptionStatus();
      setSubscriptionStatus(status);
      const state = getSubscriptionDisplayState(status);
      if (shouldShowSubscriptionBanner(state)) {
        setShowBanner(true);
        try {
          const alreadyShown = sessionStorage.getItem(SESSION_MODAL_KEY);
          if (!alreadyShown) {
            setShowModal(true);
            sessionStorage.setItem(SESSION_MODAL_KEY, "1");
          }
        } catch {
          setShowModal(true);
        }
      }
    } catch {
      // ignore
    }
  };

  const openModal = () => setShowModal(true);
  const closeModal = () => setShowModal(false);

  if (!showBanner || !subscriptionStatus) return null;

  const state = getSubscriptionDisplayState(subscriptionStatus);

  const getBannerColor = () => {
    if (state === "expired" || state === "trial_expired" || state === "cancelled") return "bg-slate-800";
    if (subscriptionStatus.days_remaining !== null && subscriptionStatus.days_remaining <= 3) return "bg-amber-600";
    return "bg-blue-600";
  };

  const getMessage = () => {
    if (state === "expired") return "Your subscription has expired. Renew now to continue using ChangeSignal AI.";
    if (state === "trial_expired") return "Your trial has ended. Upgrade now to continue using ChangeSignal AI.";
    if (state === "cancelled") return "Your subscription has been cancelled. Reactivate to continue.";
    if (state === "trial_ending_soon" && subscriptionStatus.days_remaining !== null) {
      const d = subscriptionStatus.days_remaining;
      return `Your trial ends in ${d} day${d !== 1 ? "s" : ""}. Upgrade to keep full access.`;
    }
    return "";
  };

  const ctaLabel = state === "cancelled" ? "Reactivate" : "Upgrade";

  return (
    <>
      <div
        className={`${getBannerColor()} text-white px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 relative z-40`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <FiAlertCircle className="w-5 h-5 flex-shrink-0 text-white/90" />
          <p className="font-medium text-sm sm:text-base truncate">{getMessage()}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={openModal}
            className="flex items-center gap-1 px-3 py-2 rounded-lg font-medium text-white/95 hover:bg-white/15 transition-colors text-sm"
          >
            View details <FiChevronRight className="w-4 h-4" />
          </button>
          <Link
            href="/subscription"
            className="px-4 py-2 bg-white text-slate-900 rounded-lg font-semibold hover:bg-slate-100 transition-colors text-sm"
          >
            {ctaLabel}
          </Link>
          <button
            type="button"
            onClick={() => setShowBanner(false)}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Dismiss banner"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>
      </div>
      <SubscriptionModal
        isOpen={showModal}
        onClose={closeModal}
        subscriptionStatus={subscriptionStatus}
      />
    </>
  );
}
