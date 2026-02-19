"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ReactNode } from "react";
import { api } from "@/lib/api";
import SubscriptionBanner from "./SubscriptionBanner";
import SubscriptionStatusBadge from "./SubscriptionStatusBadge";
import SubscriptionExpiredGate from "./SubscriptionExpiredGate";
import {
  FiHome,
  FiUsers,
  FiMonitor,
  FiAlertCircle,
  FiLogOut,
  FiSettings,
  FiActivity,
  FiBarChart,
  FiBell,
  FiShield,
  FiCreditCard,
} from "react-icons/fi";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [subscriptionActive, setSubscriptionActive] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setSubscriptionActive(null);
      return;
    }
    if (pathname === "/subscription") {
      setSubscriptionActive(null);
      return;
    }
    api
      .getSubscriptionStatus()
      .then((s) => setSubscriptionActive(s.is_active === true))
      .catch(() => setSubscriptionActive(false));
  }, [user, pathname]);

  const showExpiredGate =
    user &&
    !(user.is_admin || user.is_superuser) &&
    pathname !== "/subscription" &&
    subscriptionActive === false;

  if (showExpiredGate) {
    return <SubscriptionExpiredGate />;
  }

  const baseNavigation = [
    { name: "Dashboard", href: "/dashboard", icon: FiHome },
    { name: "Competitors", href: "/competitors", icon: FiUsers },
    { name: "Monitoring", href: "/monitoring", icon: FiMonitor },
    { name: "Changes", href: "/changes", icon: FiAlertCircle },
    { name: "Analytics", href: "/analytics", icon: FiBarChart },
    { name: "Subscription", href: "/subscription", icon: FiCreditCard },
    { name: "Settings", href: "/settings", icon: FiBell },
  ];

  const navigation = (user?.is_admin || user?.is_superuser)
    ? [...baseNavigation, { name: "Admin", href: "/admin", icon: FiShield }]
    : baseNavigation;

  const isActive = (href: string) => {
    return pathname === href;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 flex flex-col">
        {/* Logo */}
        <div className="p-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-900">ChangeSignal AI</h1>
              <p className="text-xs text-slate-500">Competitive Intel</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs font-medium text-slate-700 truncate" title={user?.email}>{user?.email}</p>
              <p className="text-xs text-slate-500 mt-0.5">{user?.organization?.name || "Organization"}</p>
            </div>
            <SubscriptionStatusBadge />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Status */}
        <div className="p-3 border-t border-slate-200">
          <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
            <div className="flex items-center gap-2 text-emerald-700">
              <FiActivity className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs font-medium">Monitoring Active</span>
            </div>
          </div>
        </div>

        {/* Logout */}
        <div className="p-3 border-t border-slate-200">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 text-slate-600 rounded-lg hover:bg-slate-100 hover:text-slate-900 text-sm font-medium transition-colors"
          >
            <FiLogOut className="w-5 h-5 flex-shrink-0" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="ml-64 min-h-screen flex flex-col">
        <SubscriptionBanner />
        <main className="flex-1 p-6 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
