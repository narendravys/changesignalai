"use client";

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { api } from "@/lib/api";
import { ChangeSummary } from "@/lib/types";
import {
  FiFileText,
  FiTrendingUp,
  FiAlertCircle,
  FiCheckCircle,
  FiDownload,
  FiPrinter,
  FiBarChart2,
  FiClock,
} from "react-icons/fi";
import Link from "next/link";
import { format } from "date-fns";

export default function ExecutiveReportPage() {
  const [summary, setSummary] = useState<ChangeSummary | null>(null);
  const [insights, setInsights] = useState<any>(null);
  const [trends, setTrends] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [periodDays, setPeriodDays] = useState(30);

  useEffect(() => {
    loadData();
  }, [periodDays]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [summaryData, insightsData, trendsData] = await Promise.all([
        api.getChangeSummary(periodDays, true),
        api.getAnalyticsInsights(),
        api.getAnalyticsTrends(periodDays, true),
      ]);
      setSummary(summaryData);
      setInsights(insightsData);
      setTrends(trendsData);
    } catch {
      setSummary(null);
      setInsights(null);
      setTrends(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - periodDays);
      const blob = await api.exportChangesCSV(
        start.toISOString().split("T")[0],
        end.toISOString().split("T")[0]
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `changesignal_report_${format(new Date(), "yyyy-MM-dd")}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const criticalCount = summary?.by_severity?.critical ?? 0;
  const highCount = summary?.by_severity?.high ?? 0;
  const totalChanges = summary?.total_changes ?? 0;
  const topCompetitors = trends?.most_active_competitors?.slice(0, 5) ?? [];

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

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-8 print:space-y-6">
          {/* Header - hide actions when printing */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:flex-row">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <FiFileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                Executive Summary
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Competitive intelligence at a glance • Last {periodDays} days
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 print:hidden">
              <select
                value={periodDays}
                onChange={(e) => setPeriodDays(Number(e.target.value))}
                className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={60}>Last 60 days</option>
              </select>
              <button
                onClick={handleExportCSV}
                disabled={exporting || totalChanges === 0}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 font-medium text-sm disabled:opacity-50"
              >
                <FiDownload className="w-4 h-4" />
                {exporting ? "Exporting…" : "Export CSV"}
              </button>
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
              >
                <FiPrinter className="w-4 h-4" />
                Print / PDF
              </button>
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 print:border print:shadow-none">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total changes</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{totalChanges}</p>
                </div>
                <FiTrendingUp className="w-10 h-10 text-blue-500 dark:text-blue-400 opacity-80" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">Detected in period</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 print:border print:shadow-none">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Critical</p>
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">{criticalCount}</p>
                </div>
                <FiAlertCircle className="w-10 h-10 text-red-500 dark:text-red-400 opacity-80" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">Need immediate attention</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 print:border print:shadow-none">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">High</p>
                  <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-1">{highCount}</p>
                </div>
                <FiAlertCircle className="w-10 h-10 text-orange-500 dark:text-orange-400 opacity-80" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">Important to review</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 print:border print:shadow-none">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Unacknowledged</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{summary?.unacknowledged ?? 0}</p>
                </div>
                <FiClock className="w-10 h-10 text-slate-500 dark:text-slate-400 opacity-80" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">Pending review</p>
            </div>
          </div>

          {/* Summary message */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-100 dark:border-blue-800 p-6 print:border print:break-inside-avoid">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0">
                <FiBarChart2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Summary</h2>
                <p className="text-slate-700 dark:text-slate-300 mt-2">
                  {totalChanges === 0
                    ? "No changes detected in the selected period. Monitoring is active; new changes will appear here and in the Changes view."
                    : `Over the last ${periodDays} days, ${totalChanges} change${totalChanges !== 1 ? "s" : ""} were detected across your monitored competitors. ${
                        criticalCount + highCount > 0
                          ? `${criticalCount + highCount} critical or high severity change${criticalCount + highCount !== 1 ? "s" : ""} require attention.`
                          : "No critical or high severity changes in this period."
                      } Review the Changes page for details and AI recommendations.`}
                </p>
                <Link
                  href="/changes"
                  className="inline-flex items-center gap-2 mt-4 text-blue-600 dark:text-blue-400 font-semibold hover:underline print:no-underline"
                >
                  View all changes →
                </Link>
              </div>
            </div>
          </div>

          {/* Top competitors by activity */}
          {topCompetitors.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden print:break-inside-avoid">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Top competitors by activity</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">Most changes detected in the period</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-700/50">
                    <tr>
                      <th className="text-left px-6 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Competitor</th>
                      <th className="text-right px-6 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Changes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {topCompetitors.map((c: { name: string; change_count: number }, i: number) => (
                      <tr key={c.name}>
                        <td className="px-6 py-4">
                          <span className="font-medium text-slate-900 dark:text-white">{c.name}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-semibold text-blue-600 dark:text-blue-400">{c.change_count}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Health / monitoring */}
          {insights?.monitoring_health && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 print:break-inside-avoid">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FiCheckCircle className="w-5 h-5 text-emerald-500" />
                Monitoring health
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mt-2">
                {insights.monitoring_health.active_pages} of {insights.monitoring_health.total_pages} pages active •{" "}
                {insights.monitoring_health.health_percentage}% health
              </p>
            </div>
          )}

          <p className="text-xs text-slate-500 dark:text-slate-500 print:mt-8">
            Report generated on {format(new Date(), "PPpp")} • ChangeSignal AI
          </p>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
