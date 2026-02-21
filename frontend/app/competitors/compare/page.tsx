"use client";

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { api } from "@/lib/api";
import { Competitor } from "@/lib/types";
import { FiGrid, FiExternalLink, FiBarChart2, FiMonitor } from "react-icons/fi";
import Link from "next/link";
import { format } from "date-fns";

interface CompetitorRow {
  id: number;
  name: string;
  domain: string;
  monitoredPages: number;
  changes30d: number;
  isActive: boolean;
}

export default function CompetitorComparePage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [trends, setTrends] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [periodDays, setPeriodDays] = useState(30);

  useEffect(() => {
    loadData();
  }, [periodDays]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [compData, trendsData] = await Promise.all([
        api.getCompetitors({ limit: 100 }),
        api.getAnalyticsTrends(periodDays, true),
      ]);
      setCompetitors(Array.isArray(compData) ? compData : []);
      setTrends(trendsData);
    } catch {
      setCompetitors([]);
      setTrends(null);
    } finally {
      setLoading(false);
    }
  };

  const changeCountByCompetitor: Record<string, number> = {};
  if (trends?.most_active_competitors) {
    trends.most_active_competitors.forEach((c: { name: string; change_count: number }) => {
      changeCountByCompetitor[c.name] = c.change_count;
    });
  }

  const rows: CompetitorRow[] = competitors.map((c) => ({
    id: c.id,
    name: c.name,
    domain: c.domain,
    monitoredPages: c.monitored_pages_count ?? 0,
    changes30d: changeCountByCompetitor[c.name] ?? 0,
    isActive: c.is_active,
  }));

  // Sort by changes desc, then by name
  rows.sort((a, b) => b.changes30d - a.changes30d || a.name.localeCompare(b.name));

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
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <FiGrid className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                Competitor Comparison
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Side-by-side view of competitors and their monitoring activity
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={periodDays}
                onChange={(e) => setPeriodDays(Number(e.target.value))}
                className="px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={60}>Last 60 days</option>
              </select>
              <Link
                href="/competitors"
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 font-medium text-sm inline-flex items-center gap-2"
              >
                <FiExternalLink className="w-4 h-4" />
                Manage competitors
              </Link>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-12 text-center">
              <FiGrid className="w-16 h-16 text-slate-400 dark:text-slate-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No competitors yet</h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Add competitors from the Competitors page to see a comparison matrix here.
              </p>
              <Link
                href="/competitors"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
              >
                Add competitors
              </Link>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="text-left px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-200">Competitor</th>
                      <th className="text-left px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-200">Domain</th>
                      <th className="text-center px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-200">
                        <span className="inline-flex items-center gap-1.5">
                          <FiMonitor className="w-4 h-4" />
                          Monitored pages
                        </span>
                      </th>
                      <th className="text-center px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-200">
                        <span className="inline-flex items-center gap-1.5">
                          <FiBarChart2 className="w-4 h-4" />
                          Changes ({periodDays}d)
                        </span>
                      </th>
                      <th className="text-center px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-200">Status</th>
                      <th className="text-right px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-200">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {rows.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-semibold text-slate-900 dark:text-white">{row.name}</span>
                        </td>
                        <td className="px-6 py-4">
                          <a
                            href={`https://${row.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                          >
                            {row.domain}
                          </a>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="font-medium text-slate-900 dark:text-white">{row.monitoredPages}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                              row.changes30d > 0
                                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            {row.changes30d}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              row.isActive
                                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                                : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            {row.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/changes?competitor=${encodeURIComponent(row.name)}`}
                            className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
                          >
                            View changes
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
