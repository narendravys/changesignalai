"use client";

import Link from "next/link";
import { FiCreditCard, FiLogOut } from "react-icons/fi";
import { useAuth } from "@/hooks/useAuth";

/**
 * Full-page gate when trial/subscription is expired.
 * User cannot perform any action; only renew or logout.
 */
export default function SubscriptionExpiredGate() {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="mb-6 inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100">
          <FiCreditCard className="w-8 h-8 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Subscription expired
        </h1>
        <p className="text-slate-600 mb-6">
          Your trial or subscription has ended. Renew to continue using ChangeSignal AI.
          Your data and history are saved and will be available again after you renew.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/subscription"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            <FiCreditCard className="w-5 h-5" />
            Renew subscription
          </Link>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <FiLogOut className="w-5 h-5" />
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
