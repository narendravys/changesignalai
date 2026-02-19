"use client";

import { useEffect } from "react";
import Link from "next/link";
import { FiX, FiCalendar, FiCreditCard, FiArrowRight } from "react-icons/fi";
import { format } from "date-fns";
import {
  getSubscriptionDisplayState,
  type SubscriptionStatusFromApi,
} from "@/lib/subscription";

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptionStatus: SubscriptionStatusFromApi | null;
}

const RENEW_STEPS = [
  { step: 1, label: "Go to Subscription & Billing", href: "/subscription" },
  { step: 2, label: "Click “Upgrade now” or “Renew”", href: "/subscription" },
  { step: 3, label: "Complete secure checkout", href: "/subscription" },
];

export default function SubscriptionModal({ isOpen, onClose, subscriptionStatus }: SubscriptionModalProps) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const state = getSubscriptionDisplayState(subscriptionStatus);
  const trialEndDate = subscriptionStatus?.trial_ends_at
    ? format(new Date(subscriptionStatus.trial_ends_at), "EEEE, MMMM d, yyyy")
    : null;
  const daysLeft = subscriptionStatus?.days_remaining ?? 0;

  const title =
    state === "trial_expired"
      ? "Your trial has ended"
      : state === "expired"
        ? "Your subscription has ended"
        : state === "cancelled"
          ? "Subscription cancelled"
          : "Trial ending soon";

  const subtitle =
    state === "trial_expired"
      ? "Upgrade to continue using ChangeSignal AI and keep your monitoring data."
      : state === "expired"
        ? "Renew to keep using ChangeSignal AI and your data."
        : state === "cancelled"
          ? "Reactivate your plan to continue with full access."
          : "Upgrade before your trial ends to avoid any interruption.";

  const showSteps = ["trial_ending_soon", "trial_expired", "expired", "cancelled"].includes(state);
  const showReactivate = state === "cancelled";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        aria-hidden
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 modal-enter"
        role="dialog"
        aria-labelledby="subscription-modal-title"
        aria-modal="true"
      >
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h2 id="subscription-modal-title" className="text-xl font-semibold text-slate-900">
                {title}
              </h2>
              <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              aria-label="Close"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          {/* Date / status block */}
          {(state === "trial_ending_soon" && trialEndDate) || state === "trial_expired" || state === "expired" || state === "cancelled" ? (
            <div className="mb-6 rounded-xl bg-slate-50 border border-slate-200 p-4">
              {state === "trial_ending_soon" && trialEndDate && (
                <>
                  <div className="flex items-center gap-2 text-slate-700">
                    <FiCalendar className="w-5 h-5 text-slate-500 flex-shrink-0" />
                    <span className="font-medium">Trial ends on {trialEndDate}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {daysLeft === 0 ? "Your trial ends today." : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining`}
                  </p>
                </>
              )}
              {state === "trial_expired" && (
                <p className="text-slate-700 font-medium">Your trial period has ended. Upgrade to continue.</p>
              )}
              {state === "expired" && (
                <p className="text-slate-700 font-medium">Your access has expired. Renew to continue.</p>
              )}
              {state === "cancelled" && (
                <p className="text-slate-700 font-medium">Your plan is currently cancelled. Reactivate to restore access.</p>
              )}
            </div>
          ) : null}

          {showSteps && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">
                {showReactivate ? "How to reactivate" : "How to renew or upgrade"}
              </h3>
              <ol className="space-y-3">
                {RENEW_STEPS.map(({ step, label, href }) => (
                  <li key={step} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
                      {step}
                    </span>
                    <span className="text-slate-700">{label}</span>
                    {step === 1 && (
                      <Link href={href} className="ml-auto flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700">
                        Open <FiArrowRight className="w-4 h-4" />
                      </Link>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/subscription"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              <FiCreditCard className="w-5 h-5" />
              {showReactivate ? "Reactivate plan" : "Go to Subscription & Billing"}
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Maybe later
            </button>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Need help?{" "}
            <a href="mailto:support@changesignal.ai" className="text-blue-600 hover:underline">
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
