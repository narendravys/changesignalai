"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { api, formatApiError } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { FiCheck, FiX, FiCreditCard, FiClock, FiAlertCircle } from "react-icons/fi";
import { format, formatDistanceToNow } from "date-fns";
import {
  getSubscriptionDisplayState,
  hasAccess,
  showUpgradeCta,
  showReactivateCta,
  type SubscriptionStatusFromApi,
} from "@/lib/subscription";

const RENEW_STEPS = [
  { step: 1, label: "Open Subscription & Billing (this page)", href: "#" },
  { step: 2, label: "Click “Upgrade now” or “Renew”", href: "#" },
  { step: 3, label: "Complete secure checkout", href: "#" },
];

export default function SubscriptionPage() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatusFromApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadSubscriptionStatus();
  }, []);

  useEffect(() => {
    if (searchParams.get("expired") === "1") {
      toast.error("Your subscription has expired. Renew below to continue.");
    }
    if (searchParams.get("success") === "true") {
      toast.success("Thank you! Your subscription is now active.");
      loadSubscriptionStatus();
    }
    if (searchParams.get("cancelled") === "true") {
      toast.info("Checkout was cancelled. You can upgrade anytime from this page.");
    }
  }, [searchParams]);

  const loadSubscriptionStatus = async () => {
    setLoading(true);
    try {
      const status = await api.getSubscriptionStatus();
      setSubscriptionStatus(status);
    } catch (error: any) {
      toast.error(formatApiError(error, "Failed to load subscription status"));
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    setProcessing(true);
    try {
      await api.createCheckoutSession(
        `${typeof window !== "undefined" ? window.location.origin : ""}/subscription?success=true`,
        `${typeof window !== "undefined" ? window.location.origin : ""}/subscription?cancelled=true`
      );
      toast.info("Payment integration coming soon! Contact admin for manual upgrade.");
    } catch (error: any) {
      toast.error(formatApiError(error, "Failed to start checkout"));
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel? You'll lose access immediately.")) return;
    setProcessing(true);
    try {
      await api.cancelSubscription();
      toast.success("Subscription cancelled");
      loadSubscriptionStatus();
    } catch (error: any) {
      toast.error(formatApiError(error, "Failed to cancel subscription"));
    } finally {
      setProcessing(false);
    }
  };

  const handleReactivate = async () => {
    setProcessing(true);
    try {
      await api.reactivateSubscription();
      toast.success("Subscription reactivated!");
      loadSubscriptionStatus();
    } catch (error: any) {
      toast.error(formatApiError(error, "Failed to reactivate"));
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  const state = getSubscriptionDisplayState(subscriptionStatus);
  const access = hasAccess(state);
  const showUpgrade = showUpgradeCta(state);
  const showReactivate = showReactivateCta(state);

  const statusTitle =
    state === "active"
      ? "Active Subscription"
      : state === "trial" || state === "trial_ending_soon"
        ? "Trial Period"
        : state === "trial_expired"
          ? "Trial Ended"
          : state === "expired"
            ? "Subscription Expired"
            : state === "cancelled"
              ? "Subscription Cancelled"
              : "Subscription";

  const trialEndDateFormatted =
    subscriptionStatus?.trial_ends_at
      ? format(new Date(subscriptionStatus.trial_ends_at), "EEEE, MMMM d, yyyy")
      : null;

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6 max-w-3xl">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Subscription & Billing</h1>
            <p className="text-slate-600 mt-1">Manage your plan, trial, and billing</p>
          </div>

          {/* Current Status Card */}
          <div
            className={`rounded-xl border p-6 sm:p-8 ${
              access ? "bg-emerald-50/80 border-emerald-200" : "bg-slate-50 border-slate-200"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  {access ? (
                    <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
                      <FiCheck className="w-7 h-7 text-white" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-slate-400 rounded-full flex items-center justify-center">
                      <FiX className="w-7 h-7 text-white" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">{statusTitle}</h2>
                    <p className="text-slate-600 text-sm mt-0.5">
                      Status: <span className={`font-medium ${access ? "text-emerald-600" : "text-slate-700"}`}>
                        {state.replace("_", " ")}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {(state === "trial" || state === "trial_ending_soon") && subscriptionStatus?.trial_ends_at && (
                    <div className="flex items-center gap-2">
                      <FiClock className="w-5 h-5 text-slate-500 flex-shrink-0" />
                      <p className="text-slate-700 text-sm">
                        Trial ends on <strong>{trialEndDateFormatted}</strong>
                        {subscriptionStatus.days_remaining != null && (
                          <span className="ml-1">
                            ({subscriptionStatus.days_remaining} day{subscriptionStatus.days_remaining !== 1 ? "s" : ""} left)
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                  {state === "active" && subscriptionStatus?.subscription_ends_at && (
                    <div className="flex items-center gap-2">
                      <FiClock className="w-5 h-5 text-slate-500 flex-shrink-0" />
                      <p className="text-slate-700 text-sm">
                        Renews {formatDistanceToNow(new Date(subscriptionStatus.subscription_ends_at!), { addSuffix: true })}
                      </p>
                    </div>
                  )}
                  {(state === "trial_expired" || state === "expired" || state === "cancelled") && (
                    <div className="flex items-center gap-2">
                      <FiAlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <p className="text-slate-700 font-medium text-sm">
                        {state === "cancelled"
                          ? "Reactivate below to restore access."
                          : "Upgrade or renew below to continue using ChangeSignal AI."}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {showReactivate && (
                  <button
                    onClick={handleReactivate}
                    disabled={processing}
                    className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-semibold disabled:opacity-50 transition-colors"
                  >
                    {processing ? "Processing..." : "Reactivate"}
                  </button>
                )}
                {showUpgrade && (
                  <button
                    onClick={handleUpgrade}
                    disabled={processing}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold disabled:opacity-50 transition-colors"
                  >
                    {processing ? "Processing..." : "Upgrade Now"}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Steps to renew – when user has no access */}
          {!access && (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">How to renew or upgrade</h3>
              <ol className="space-y-3">
                {RENEW_STEPS.map(({ step, label }) => (
                  <li key={step} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
                      {step}
                    </span>
                    <span className="text-slate-700 text-sm">{label}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-sm text-slate-600">
                Use the <strong>Upgrade Now</strong> or <strong>Reactivate</strong> button above to continue.
              </p>
            </div>
          )}

          {/* Pricing Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Pro Plan</h3>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-3xl font-bold text-slate-900">${subscriptionStatus?.monthly_price ?? 0}</span>
              <span className="text-slate-600">/month</span>
            </div>
            <ul className="space-y-3 mb-6">
              {[
                "Unlimited competitor monitoring",
                "AI-powered change detection & analysis",
                "Real-time alerts via email & webhooks",
                "Advanced analytics & insights",
                "Full screenshot history",
                "Priority support",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <FiCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 text-sm">{item}</span>
                </li>
              ))}
            </ul>
            {state === "active" && (
              <button
                onClick={handleCancel}
                disabled={processing}
                className="w-full px-4 py-2.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 font-medium text-sm disabled:opacity-50 transition-colors"
              >
                {processing ? "Processing..." : "Cancel Subscription"}
              </button>
            )}
          </div>

          {/* Help */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
            <div className="flex items-start gap-4">
              <FiCreditCard className="w-6 h-6 text-slate-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-slate-900 text-sm">Need help?</h4>
                <p className="text-slate-600 text-sm mt-1">
                  Questions about billing or your plan? We're here to help.
                </p>
                <a
                  href="mailto:support@changesignal.ai"
                  className="text-blue-600 hover:underline text-sm font-medium mt-2 inline-block"
                >
                  Contact support →
                </a>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
