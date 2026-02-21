"use client";

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { api, formatApiError } from "@/lib/api";
import {
  FiTrendingUp, FiTrendingDown, FiActivity, FiClock,
  FiAlertCircle, FiCheckCircle, FiBarChart2, FiPieChart, FiShield
} from "react-icons/fi";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";

export default function AnalyticsPage() {
  const toast = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30);
  const [changesOnly, setChangesOnly] = useState(false);
  
  // Analytics data
  const [trends, setTrends] = useState<any>(null);
  const [insights, setInsights] = useState<any>(null);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange, changesOnly]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [trendsData, insightsData] = await Promise.all([
        api.getAnalyticsTrends(timeRange, changesOnly),
        api.getAnalyticsInsights(),
      ]);
      setTrends(trendsData);
      setInsights(insightsData);
    } catch (error: any) {
      toast.error(formatApiError(error, "Failed to load analytics"));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-slate-400 font-medium">Loading analytics...</p>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  const totalChanges = trends?.changes_by_day?.reduce((sum: number, day: any) => sum + day.count, 0) || 0;
  const avgChangesPerDay = totalChanges > 0 ? (totalChanges / (trends?.changes_by_day?.length || 1)).toFixed(1) : 0;

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                  Analytics & Insights
                </h1>
                {(user?.is_admin || user?.is_superuser) && (
                  <span className="px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-sm font-bold flex items-center space-x-1">
                    <FiShield className="w-4 h-4" />
                    <span>Admin View (All Organizations)</span>
                  </span>
                )}
              </div>
              <p className="text-gray-600 dark:text-slate-400 mt-2">
                {(user?.is_admin || user?.is_superuser)
                  ? "Viewing analytics across all organizations"
                  : changesOnly 
                    ? "Track detected changes, analyze patterns, and gain competitive intelligence"
                    : "Track all monitoring activity including stability checks"}
              </p>
            </div>
            
            {/* Time Range Selector */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setChangesOnly(!changesOnly)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all border-2 ${
                  changesOnly
                    ? "bg-gradient-to-r from-orange-600 to-red-600 text-white border-transparent shadow-lg"
                    : "bg-gradient-to-r from-green-600 to-emerald-600 text-white border-transparent shadow-lg"
                }`}
              >
                {changesOnly ? "📊 Changes Only" : "📈 All Activity"}
              </button>
              
              <span className="text-sm text-gray-600 dark:text-slate-400 font-medium">Time Range:</span>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(Number(e.target.value))}
                className="px-4 py-2 border-2 border-gray-200 dark:border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none transition-colors bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                <option value={7}>Last 7 Days</option>
                <option value={30}>Last 30 Days</option>
                <option value={60}>Last 60 Days</option>
                <option value={90}>Last 90 Days</option>
              </select>
              <button
                onClick={loadAnalytics}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border-2 border-gray-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-600 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-slate-400 font-medium">
                    {changesOnly ? "Total Changes" : "Total Checks"}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{totalChanges}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                    Last {timeRange} days
                    {!changesOnly && totalChanges === 0 && " • No activity"}
                  </p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                  <FiTrendingUp className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border-2 border-gray-100 dark:border-slate-700 hover:border-orange-200 dark:hover:border-orange-600 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-slate-400 font-medium">Urgent Actions</p>
                  <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">
                    {insights?.urgent_action_required || 0}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">Need review</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                  <FiAlertCircle className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border-2 border-gray-100 dark:border-slate-700 hover:border-green-200 dark:hover:border-green-600 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-slate-400 font-medium">Avg Response Time</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                    {insights?.avg_response_time_hours || "N/A"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">Hours</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                  <FiClock className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border-2 border-gray-100 dark:border-slate-700 hover:border-purple-200 dark:hover:border-purple-600 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-slate-400 font-medium">Monitoring Health</p>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                    {insights?.monitoring_health?.health_percentage || 0}%
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                    {insights?.monitoring_health?.active_pages}/{insights?.monitoring_health?.total_pages} active
                  </p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <FiActivity className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Urgent Changes Alert */}
          {insights?.urgent_action_required > 0 && (
            <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-2 border-orange-200 dark:border-orange-700 rounded-xl p-5">
              <div className="flex items-start">
                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FiAlertCircle className="w-6 h-6 text-white" />
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {insights.urgent_action_required} Critical/High Priority Changes Need Attention
                  </h3>
                  <div className="mt-3 space-y-2">
                    {insights.urgent_changes?.slice(0, 3).map((change: any) => (
                      <div key={change.id} className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-orange-200 dark:border-orange-700">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="px-2 py-1 text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">
                                {change.severity.toUpperCase()}
                              </span>
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                {change.competitor_name}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 dark:text-slate-300 mt-2">{change.summary}</p>
                          </div>
                          <button
                            onClick={() => window.location.href = `/changes?id=${change.id}`}
                            className="ml-4 px-3 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm rounded-lg hover:shadow-lg transition-all"
                          >
                            Review
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Info Banner for Monitoring Activity */}
          {!changesOnly && totalChanges > 0 && insights?.urgent_action_required === 0 && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-700 rounded-xl p-5">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FiCheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">All Systems Stable</h4>
                  <p className="text-gray-700 dark:text-slate-300 mt-1">
                    Your monitoring is running successfully with {totalChanges} check{totalChanges !== 1 ? 's' : ''} in the last {timeRange} days, 
                    but no significant changes have been detected. Toggle to "Changes Only" mode to filter for actual changes.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Charts Row */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Changes Over Time */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border-2 border-gray-100 dark:border-slate-700">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                  <FiBarChart2 className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                  {changesOnly ? "Changes Over Time" : "Monitoring Activity Over Time"}
                </h3>
                <span className="text-sm text-gray-600 dark:text-slate-400">
                  Avg: {avgChangesPerDay} per day
                </span>
              </div>
              
              {/* Simple Bar Chart */}
              <div className="space-y-2">
                {trends?.changes_by_day?.slice(-14).map((day: any, index: number) => {
                  const maxCount = Math.max(...trends.changes_by_day.map((d: any) => d.count));
                  const width = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                  
                  return (
                    <div key={index} className="flex items-center">
                      <span className="text-xs text-gray-600 dark:text-slate-400 w-20 flex-shrink-0">
                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      <div className="flex-1 ml-3">
                        <div className="bg-gray-100 dark:bg-slate-700 rounded-full h-8 relative overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-end pr-2 transition-all"
                            style={{ width: `${width}%` }}
                          >
                            {day.count > 0 && (
                              <span className="text-xs font-bold text-white">{day.count}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Severity Distribution */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border-2 border-gray-100 dark:border-slate-700">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                  <FiPieChart className="w-5 h-5 mr-2 text-purple-600 dark:text-purple-400" />
                  Severity Distribution
                </h3>
              </div>
              
              <div className="space-y-3">
                {Object.entries(trends?.changes_by_severity || {}).map(([severity, count]: [string, any]) => {
                  const colors: any = {
                    critical: { bg: "bg-red-500", light: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400" },
                    high: { bg: "bg-orange-500", light: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-400" },
                    medium: { bg: "bg-yellow-500", light: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-400" },
                    low: { bg: "bg-blue-500", light: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400" },
                  };
                  const color = colors[severity] || colors.low;
                  const percentage = totalChanges > 0 ? ((count / totalChanges) * 100).toFixed(1) : 0;
                  
                  return (
                    <div key={severity}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`px-3 py-1 text-xs font-bold ${color.light} ${color.text} rounded-lg uppercase`}>
                          {severity}
                        </span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {count} ({percentage}%)
                        </span>
                      </div>
                      <div className="bg-gray-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-full ${color.bg} rounded-full transition-all`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Change Types & Top Competitors */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Change Types */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border-2 border-gray-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                {changesOnly ? "Change Types" : "Activity Types"}
              </h3>
              <div className="space-y-3">
                {Object.entries(trends?.changes_by_type || {}).map(([type, count]: [string, any]) => {
                  const percentage = totalChanges > 0 ? ((count / totalChanges) * 100).toFixed(1) : 0;
                  
                  return (
                    <div key={type} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-semibold text-gray-700 dark:text-slate-300 capitalize">{type}</span>
                          <span className="text-sm font-bold text-gray-900 dark:text-white">{count}</span>
                        </div>
                        <div className="bg-gray-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Most Active Competitors */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border-2 border-gray-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                {changesOnly ? "Competitors with Most Changes" : "Most Monitored Competitors"}
              </h3>
              <div className="space-y-3">
                {trends?.most_active_competitors?.slice(0, 5).map((competitor: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        #{index + 1}
                      </div>
                      <span className="font-semibold text-gray-900 dark:text-white">{competitor.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{competitor.change_count}</span>
                      <span className="text-xs text-gray-500 dark:text-slate-500">changes</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
