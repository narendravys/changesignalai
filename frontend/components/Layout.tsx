"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ReactNode } from "react";
import { api } from "@/lib/api";
import type { SubscriptionStatusFromApi } from "@/lib/subscription";
import SubscriptionBanner from "./SubscriptionBanner";
import SubscriptionStatusBadge from "./SubscriptionStatusBadge";
import SubscriptionExpiredGate from "./SubscriptionExpiredGate";
import ThemeToggle from "./ThemeToggle";
import {
  FiHome,
  FiUsers,
  FiMonitor,
  FiAlertCircle,
  FiLogOut,
  FiActivity,
  FiBarChart,
  FiBell,
  FiShield,
  FiCreditCard,
  FiChevronLeft,
  FiChevronRight,
  FiFileText,
  FiGrid,
} from "react-icons/fi";

const SIDEBAR_STORAGE_KEY = "changesignal_sidebar_collapsed";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatusFromApi | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      setSidebarCollapsed(stored === "true");
    } catch {
      setSidebarCollapsed(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setSubscriptionStatus(null);
      return;
    }
    if (pathname === "/subscription") {
      setSubscriptionStatus(null);
      return;
    }
    api
      .getSubscriptionStatus()
      .then(setSubscriptionStatus)
      .catch(() => setSubscriptionStatus(null));
  }, [user, pathname]);

  const toggleSidebar = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
    } catch {}
  };

  const subscriptionActive = subscriptionStatus?.is_active === true;
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
    { name: "Report", href: "/report", icon: FiFileText },
    { name: "Competitors", href: "/competitors", icon: FiUsers },
    { name: "Compare", href: "/competitors/compare", icon: FiGrid },
    { name: "Monitoring", href: "/monitoring", icon: FiMonitor },
    { name: "Changes", href: "/changes", icon: FiAlertCircle },
    { name: "Analytics", href: "/analytics", icon: FiBarChart },
    { name: "Subscription", href: "/subscription", icon: FiCreditCard },
    { name: "Settings", href: "/settings", icon: FiBell },
  ];

  const navigation = (user?.is_admin || user?.is_superuser)
    ? [...baseNavigation, { name: "Admin", href: "/admin", icon: FiShield }]
    : baseNavigation;

  const isActive = (href: string) => pathname === href;

  const sidebarWidth = !mounted || !sidebarCollapsed ? "w-64" : "w-[72px]";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 ${sidebarWidth} bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col z-30 transition-all duration-200 ease-in-out`}
      >
        {/* Logo + collapse */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            {(!mounted || !sidebarCollapsed) && (
              <div className="min-w-0">
                <h1 className="text-base font-semibold text-slate-900 dark:text-white truncate">ChangeSignal AI</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">Competitive Intel</p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={toggleSidebar}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 dark:text-slate-400 flex-shrink-0"
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <FiChevronRight className="w-5 h-5" /> : <FiChevronLeft className="w-5 h-5" />}
          </button>
        </div>

        {(!mounted || !sidebarCollapsed) && (
          <div className="px-4 pt-3 pb-2 border-b border-slate-200 dark:border-slate-700">
            <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate" title={user?.email}>{user?.email}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{user?.organization?.name || "Organization"}</p>
            </div>
            <SubscriptionStatusBadge subscriptionStatus={subscriptionStatus} />
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                title={sidebarCollapsed ? item.name : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-600 text-white dark:bg-blue-500"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-200"
                } ${sidebarCollapsed ? "justify-center" : ""}`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {(!mounted || !sidebarCollapsed) && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Status + Theme + Logout */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-700 space-y-1">
          {(!mounted || !sidebarCollapsed) && (
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 mb-2">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <FiActivity className="w-4 h-4 flex-shrink-0" />
                <span className="text-xs font-medium">Monitoring Active</span>
              </div>
            </div>
          )}
          <div className={`flex items-center ${sidebarCollapsed ? "justify-center" : "gap-2"}`}>
            <ThemeToggle />
            <button
              onClick={logout}
              className={`flex items-center gap-3 w-full px-3 py-2.5 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-200 text-sm font-medium transition-colors ${sidebarCollapsed ? "justify-center" : ""}`}
            >
              <FiLogOut className="w-5 h-5 flex-shrink-0" />
              {(!mounted || !sidebarCollapsed) && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={`min-h-screen flex flex-col transition-all duration-200 ${!mounted || !sidebarCollapsed ? "ml-64" : "ml-[72px]"}`}>
        <SubscriptionBanner subscriptionStatus={subscriptionStatus} />
        <main className="flex-1 p-6 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
