"use client";

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import ActivityFeed from "@/components/ActivityFeed";
import { api } from "@/lib/api";
import { ChangeSummary, ChangeEvent } from "@/lib/types";
import { 
  FiAlertCircle, FiUsers, FiMonitor, FiTrendingUp, 
  FiArrowUp, FiArrowDown, FiClock, FiCheckCircle,
  FiZap, FiActivity
} from "react-icons/fi";
import Link from "next/link";
import { format } from "date-fns";

export default function DashboardPage() {
  const [summary, setSummary] = useState<ChangeSummary | null>(null);
  const [recentChanges, setRecentChanges] = useState<ChangeEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    // Refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const [summaryData, changesData] = await Promise.all([
        api.getChangeSummary(7, false), // Show all monitoring activity, not just changes
        api.getChangeEvents({ limit: 10, changes_only: false }),
      ]);
      setSummary(summaryData);
      setRecentChanges(changesData);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      low: "text-blue-600 bg-blue-50 border-blue-200",
      medium: "text-yellow-600 bg-yellow-50 border-yellow-200",
      high: "text-orange-600 bg-orange-50 border-orange-200",
      critical: "text-red-600 bg-red-50 border-red-200",
    };
    return colors[severity as keyof typeof colors] || colors.low;
  };

  const getSeverityGradient = (severity: string) => {
    const gradients = {
      low: "from-blue-500 to-cyan-500",
      medium: "from-yellow-500 to-orange-500",
      high: "from-orange-500 to-red-500",
      critical: "from-red-500 to-rose-600",
    };
    return gradients[severity as keyof typeof gradients] || gradients.low;
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Loading your intelligence dashboard...</p>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  const criticalCount = (summary?.by_severity?.critical || 0);
  const highCount = (summary?.by_severity?.high || 0);

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Intelligence Dashboard</h1>
              <p className="text-slate-600 mt-1 flex items-center gap-2 text-sm">
                <FiActivity className="w-4 h-4 text-emerald-600" />
                Real-time competitive monitoring
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={loadDashboardData}
                className="px-4 py-2 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 transition-all flex items-center space-x-2 group"
              >
                <FiClock className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">Refresh</span>
              </button>
              <Link
                href="/monitoring"
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
              >
                Add Monitoring
              </Link>
            </div>
          </div>

          {/* Alert Banner */}
          {(criticalCount > 0 || highCount > 0) && (
            <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <FiAlertCircle className="w-6 h-6 text-red-600 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Critical Changes Detected</h3>
                    <p className="text-sm text-gray-700 mt-1">
                      {criticalCount + highCount} high-priority changes require your attention
                    </p>
                  </div>
                </div>
                <Link
                  href="/changes"
                  className="px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-all shadow-lg"
                >
                  Review Now
                </Link>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Total Changes */}
            <div className="relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all border border-gray-100">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full -mr-16 -mt-16 opacity-50"></div>
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                    <FiTrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-right">
                    <div className="flex items-center text-green-600 text-sm font-medium">
                      <FiArrowUp className="w-4 h-4 mr-1" />
                      <span>Last 7d</span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Changes</p>
                  <p className="text-4xl font-bold text-gray-900 mt-1">
                    {summary?.total_changes || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Critical & High */}
            <div className="relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all border border-gray-100">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-100 to-orange-100 rounded-full -mr-16 -mt-16 opacity-50"></div>
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                    <FiAlertCircle className="w-6 h-6 text-white" />
                  </div>
                  {(criticalCount + highCount) > 0 && (
                    <div className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full animate-pulse">
                      URGENT
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Critical & High</p>
                  <p className="text-4xl font-bold text-red-600 mt-1">
                    {criticalCount + highCount}
                  </p>
                </div>
              </div>
            </div>

            {/* Unacknowledged */}
            <div className="relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all border border-gray-100">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full -mr-16 -mt-16 opacity-50"></div>
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                    <FiClock className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Pending Review</p>
                  <p className="text-4xl font-bold text-orange-600 mt-1">
                    {summary?.unacknowledged || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Active Pages */}
            <div className="relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all border border-gray-100">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full -mr-16 -mt-16 opacity-50"></div>
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                    <FiMonitor className="w-6 h-6 text-white" />
                  </div>
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 font-medium">Active Monitoring</p>
                  <Link href="/monitoring" className="text-4xl font-bold text-green-600 mt-1 hover:text-green-700 block">
                    View All →
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Severity Breakdown */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg mr-3 flex items-center justify-center">
                    <FiZap className="w-5 h-5 text-white" />
                  </div>
                  Severity Distribution
                </h2>
                <div className="space-y-4">
                  {summary && Object.entries(summary.by_severity).map(([severity, count]) => (
                    <div key={severity} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${getSeverityGradient(severity)}`}></div>
                        <span className="text-sm font-medium text-gray-700 capitalize">{severity}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${getSeverityGradient(severity)}`}
                            style={{ width: `${Math.min((count / (summary?.total_changes || 1)) * 100, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-lg font-bold text-gray-900 w-8 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Changes */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg mr-3 flex items-center justify-center">
                      <FiActivity className="w-5 h-5 text-white" />
                    </div>
                    Recent Activity
                  </h2>
                  <Link
                    href="/changes"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center"
                  >
                    View all
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>

                {recentChanges.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <FiMonitor className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-600 font-medium">No changes detected yet</p>
                    <p className="text-sm text-gray-500 mt-2">Add competitors to start monitoring</p>
                    <Link
                      href="/competitors"
                      className="inline-block mt-4 px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all"
                    >
                      Add Competitor
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {recentChanges.map((change) => (
                      <Link
                        key={change.id}
                        href={`/changes`}
                        className="block p-4 border-2 border-gray-100 rounded-xl hover:border-blue-300 hover:shadow-md transition-all group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span
                                className={`px-3 py-1 text-xs font-bold rounded-full border ${getSeverityColor(
                                  change.severity
                                )}`}
                              >
                                {change.severity.toUpperCase()}
                              </span>
                              <span className="text-xs font-medium text-gray-600">
                                {change.competitor_name}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                              {change.summary}
                            </p>
                            <p className="text-xs text-gray-500 flex items-center">
                              <FiClock className="w-3 h-3 mr-1" />
                              {format(new Date(change.created_at), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          </div>
                          <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid md:grid-cols-3 gap-6">
            <Link
              href="/competitors"
              className="block bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white hover:shadow-xl transition-all group"
            >
              <FiUsers className="w-10 h-10 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold mb-2">Manage Competitors</h3>
              <p className="text-blue-100 text-sm">Add and manage competitors you're tracking</p>
            </Link>

            <Link
              href="/monitoring"
              className="block bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-6 text-white hover:shadow-xl transition-all group"
            >
              <FiMonitor className="w-10 h-10 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold mb-2">Configure Monitoring</h3>
              <p className="text-purple-100 text-sm">Set up pages to monitor and check frequency</p>
            </Link>

            <Link
              href="/changes"
              className="block bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white hover:shadow-xl transition-all group"
            >
              <FiAlertCircle className="w-10 h-10 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="text-xl font-bold mb-2">View All Changes</h3>
              <p className="text-green-100 text-sm">Review detected changes and insights</p>
            </Link>
          </div>

          {/* Activity Feed */}
          <ActivityFeed limit={15} />
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
