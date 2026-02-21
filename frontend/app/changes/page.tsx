"use client";
// Changes UI: we only show human_readable_comparison (readable summary). We do NOT display diff_preview (raw BEFORE/AFTER).

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { api, formatApiError } from "@/lib/api";
import { ChangeEvent } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import { 
  FiFilter, FiCheck, FiExternalLink, FiAlertCircle,
  FiClock, FiZap, FiTrendingUp, FiSearch, FiDownload, FiShield, FiCheckCircle,
  FiTarget, FiFileText, FiChevronDown, FiChevronUp
} from "react-icons/fi";
import Pagination from "@/components/Pagination";
import { format } from "date-fns";
import { useToast } from "@/hooks/useToast";

export default function ChangesPage() {
  const toast = useToast();
  const { user } = useAuth();
  const [changes, setChanges] = useState<ChangeEvent[]>([]);
  const [filteredChanges, setFilteredChanges] = useState<ChangeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<string>("");
  const [acknowledgedFilter, setAcknowledgedFilter] = useState<string>("");
  const [changesOnlyFilter, setChangesOnlyFilter] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const changesPageSize = 10;

  useEffect(() => {
    loadChanges();
  }, [severityFilter, acknowledgedFilter, changesOnlyFilter]);

  useEffect(() => {
    filterChanges();
  }, [changes, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, severityFilter, acknowledgedFilter, changesOnlyFilter]);

  const filterChanges = () => {
    if (!searchTerm) {
      setFilteredChanges(changes);
      return;
    }
    
    const term = searchTerm.toLowerCase();
    const filtered = changes.filter(change =>
      change.summary?.toLowerCase().includes(term) ||
      change.competitor_name?.toLowerCase().includes(term) ||
      change.business_impact?.toLowerCase().includes(term) ||
      change.human_readable_comparison?.toLowerCase().includes(term) ||
      change.recommended_action?.toLowerCase().includes(term)
    );
    setFilteredChanges(filtered);
  };

  const loadChanges = async () => {
    try {
      const params: any = {};
      if (severityFilter) params.severity = severityFilter;
      if (acknowledgedFilter) params.acknowledged = acknowledgedFilter === "true";
      params.changes_only = changesOnlyFilter;
      
      const data = await api.getChangeEvents(params);
      setChanges(data);
    } catch (error) {
      console.error("Failed to load changes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (id: number) => {
    try {
      await api.updateChangeEvent(id, { acknowledged: true });
      loadChanges();
      toast.success("Change acknowledged successfully!");
    } catch (error: any) {
      toast.error(formatApiError(error, "Failed to acknowledge change"));
    }
  };

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const blob = await api.exportChangesCSV();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `changesignal_changes_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success("Changes exported successfully!");
    } catch (error: any) {
      toast.error(formatApiError(error, "Failed to export changes"));
    } finally {
      setExporting(false);
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

  const toggleExpanded = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const paginatedChanges = (() => {
    const start = (currentPage - 1) * changesPageSize;
    return filteredChanges.slice(start, start + changesPageSize);
  })();
  const changesTotalPages = Math.max(1, Math.ceil(filteredChanges.length / changesPageSize));

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-slate-400 font-medium">Loading change events...</p>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  };

  const actualChanges = changes.filter(c => c.change_detected);
  const noChanges = changes.filter(c => !c.change_detected);
  const criticalCount = actualChanges.filter(c => c.severity === 'critical').length;
  const highCount = actualChanges.filter(c => c.severity === 'high').length;
  const unacknowledgedCount = actualChanges.filter(c => !c.acknowledged).length;

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                  Change Events
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
                  ? "Viewing all change events across all organizations" 
                  : "Review and analyze detected competitor changes"}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleExportCSV}
                disabled={exporting || filteredChanges.length === 0}
                className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all flex items-center space-x-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {exporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <FiDownload className="w-4 h-4" />
                    <span>Export CSV</span>
                  </>
                )}
              </button>
              <button
                onClick={loadChanges}
                className="px-6 py-2 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-600 rounded-xl hover:border-blue-500 dark:hover:border-blue-400 transition-all flex items-center space-x-2 font-medium text-gray-700 dark:text-slate-300"
              >
                <FiClock className="w-4 h-4" />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border-2 border-gray-100 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-slate-400 font-medium">
                    {changesOnlyFilter ? "Changes Detected" : "Total Checks"}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{changes.length}</p>
                  {!changesOnlyFilter && actualChanges.length > 0 && (
                    <p className="text-xs text-green-600 font-semibold mt-1">
                      {actualChanges.length} with changes
                    </p>
                  )}
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                  <FiTrendingUp className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border-2 border-gray-100 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-slate-400 font-medium">Critical</p>
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">{criticalCount + highCount}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                  <FiAlertCircle className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border-2 border-gray-100 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-slate-400 font-medium">Pending Review</p>
                  <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-1">{unacknowledgedCount}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                  <FiClock className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border-2 border-gray-100 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-slate-400 font-medium">Acknowledged</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">{actualChanges.length - unacknowledgedCount}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                  <FiCheck className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Info Banner for No Changes */}
          {!changesOnlyFilter && actualChanges.length === 0 && changes.length > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-xl p-5">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FiCheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">All Monitoring Checks Stable</h4>
                  <p className="text-gray-700 dark:text-slate-300 mt-1">
                    Showing {changes.length} monitoring check{changes.length !== 1 ? 's' : ''} with no changes detected. 
                    This means your competitors' pages are stable. Toggle to "Changes Only" to hide these.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Search and Filters */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border-2 border-gray-100 dark:border-slate-700 p-5">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by summary, competitor, impact, or what changed..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none transition-colors bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
                />
              </div>
              
              {/* Filters */}
              <div className="flex gap-3">
                <div className="flex items-center space-x-2">
                  <FiFilter className="text-gray-600 dark:text-slate-400 w-5 h-5" />
                  <select
                    className="px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none transition-colors font-medium bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                  >
                    <option value="">All Severity</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                
                <select
                  className="px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none transition-colors font-medium bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  value={acknowledgedFilter}
                  onChange={(e) => setAcknowledgedFilter(e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="false">Unacknowledged</option>
                  <option value="true">Acknowledged</option>
                </select>
                
                <button
                  onClick={() => setChangesOnlyFilter(!changesOnlyFilter)}
                  className={`px-5 py-3 rounded-lg font-semibold transition-all border-2 ${
                    changesOnlyFilter
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent shadow-lg"
                      : "bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-400"
                  }`}
                >
                  {changesOnlyFilter ? "Changes Only" : "All Checks"}
                </button>
              </div>
            </div>
          </div>

          {/* Changes List */}
          {filteredChanges.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full mx-auto mb-4 flex items-center justify-center">
                <FiAlertCircle className="w-8 h-8 text-gray-400 dark:text-slate-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {changesOnlyFilter ? "No Changes Detected Yet" : "No Records Found"}
              </h3>
              <p className="text-gray-600 dark:text-slate-400">
                {searchTerm || severityFilter || acknowledgedFilter 
                  ? "No records match your search or filters."
                  : changesOnlyFilter
                    ? "Your monitoring checks haven't detected any changes yet. Try toggling to 'All Checks' to see monitoring activity."
                    : "Start monitoring competitors to see activity here."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedChanges.map((change) => {
                const isExpanded = expandedIds.has(change.id);
                return (
                  <div
                    key={change.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-gray-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-xl transition-all p-6 group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Badges row */}
                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                          <span
                            className={`px-4 py-1.5 text-xs font-bold rounded-full border-2 ${
                              change.change_detected
                                ? "bg-gradient-to-r from-red-500 to-orange-500 text-white border-transparent"
                                : "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700"
                            }`}
                          >
                            {change.change_detected ? "⚠️ CHANGE DETECTED" : "✓ No Change"}
                          </span>
                          <span
                            className={`px-4 py-1.5 text-xs font-bold rounded-full border-2 ${getSeverityColor(
                              change.severity
                            )}`}
                          >
                            <span className={`inline-block w-2 h-2 rounded-full bg-gradient-to-r ${getSeverityGradient(change.severity)} mr-2`} />
                            {change.severity.toUpperCase()}
                          </span>
                          <span className="px-4 py-1.5 text-xs font-bold rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-2 border-purple-200 dark:border-purple-700">
                            {change.change_type}
                          </span>
                          <span className="px-4 py-1.5 text-xs font-bold rounded-full bg-gray-50 dark:bg-slate-700 text-gray-700 dark:text-slate-300 border-2 border-gray-200 dark:border-slate-600">
                            {change.competitor_name}
                          </span>
                          {change.acknowledged && (
                            <span className="px-4 py-1.5 text-xs font-bold rounded-full bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-2 border-green-200 dark:border-green-700 flex items-center gap-2">
                              <FiCheck className="w-3 h-3" /> Acknowledged
                            </span>
                          )}
                        </div>

                        {/* Summary headline – always visible */}
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                          {change.summary}
                        </h3>

                        {/* Collapsed: date + link only */}
                        <div className="flex items-center gap-4 text-sm flex-wrap">
                          <div className="flex items-center text-gray-500 dark:text-slate-500">
                            <FiClock className="w-4 h-4 mr-2 flex-shrink-0" />
                            {format(new Date(change.created_at), "MMM d, yyyy 'at' h:mm a")}
                          </div>
                          <a
                            href={change.page_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                          >
                            View Page
                            <FiExternalLink className="w-4 h-4 ml-1" />
                          </a>
                        </div>

                        {/* Expanded: full details */}
                        {isExpanded && (
                          <>
                            {change.change_detected && change.human_readable_comparison?.trim() && (
                              <div className="mt-5 mb-5">
                                <div className="flex items-center space-x-2 mb-2">
                                  <FiFileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                  <span className="text-sm font-bold text-gray-800 dark:text-slate-200">What changed</span>
                                </div>
                                <div className="p-4 bg-gray-50/80 dark:bg-slate-700/80 rounded-xl border border-gray-200 dark:border-slate-600 text-gray-800 dark:text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                                  {change.human_readable_comparison.trim()}
                                </div>
                              </div>
                            )}
                            {change.change_detected && (
                              <div className="grid md:grid-cols-2 gap-4 mb-4">
                                <div className="p-4 rounded-xl border-2 border-amber-100 dark:border-amber-800 bg-gradient-to-br from-amber-50/80 to-orange-50/50 dark:from-amber-900/20 dark:to-orange-900/20">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <FiZap className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                    <span className="text-sm font-bold text-amber-900 dark:text-amber-200">Business impact</span>
                                  </div>
                                  <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
                                    {change.business_impact?.trim() || "Impact analysis will appear here after the next analysis run."}
                                  </p>
                                </div>
                                <div className="p-4 rounded-xl border-2 border-emerald-100 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/80 to-green-50/50 dark:from-emerald-900/20 dark:to-green-900/20">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <FiTarget className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                    <span className="text-sm font-bold text-emerald-900 dark:text-emerald-200">Recommended action</span>
                                  </div>
                                  <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
                                    {change.recommended_action?.trim() || "Recommended next steps will appear here after analysis."}
                                  </p>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!change.acknowledged && (
                          <button
                            onClick={() => handleAcknowledge(change.id)}
                            className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg flex items-center space-x-2"
                          >
                            <FiCheck className="w-5 h-5" />
                            <span>Acknowledge</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleExpanded(change.id)}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 font-medium text-sm transition-colors"
                        >
                          {isExpanded ? (
                            <>
                              <FiChevronUp className="w-4 h-4" />
                              Show less
                            </>
                          ) : (
                            <>
                              <FiChevronDown className="w-4 h-4" />
                              Show more
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {filteredChanges.length > 0 && (
            <div className="mt-4 overflow-hidden rounded-2xl border-2 border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800">
              <Pagination
                currentPage={currentPage}
                totalPages={changesTotalPages}
                totalItems={filteredChanges.length}
                pageSize={changesPageSize}
                onPageChange={setCurrentPage}
                label="changes"
              />
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
