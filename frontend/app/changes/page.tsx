"use client";

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { api, formatApiError } from "@/lib/api";
import { ChangeEvent } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import { 
  FiFilter, FiCheck, FiExternalLink, FiAlertCircle,
  FiClock, FiZap, FiTrendingUp, FiSearch, FiDownload, FiShield, FiCheckCircle,
  FiCode
} from "react-icons/fi";
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

  useEffect(() => {
    loadChanges();
  }, [severityFilter, acknowledgedFilter, changesOnlyFilter]);

  useEffect(() => {
    filterChanges();
  }, [changes, searchTerm]);

  const filterChanges = () => {
    if (!searchTerm) {
      setFilteredChanges(changes);
      return;
    }
    
    const filtered = changes.filter(change =>
      change.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      change.competitor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      change.business_impact?.toLowerCase().includes(searchTerm.toLowerCase())
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

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Loading change events...</p>
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
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Change Events
                </h1>
                {(user?.is_admin || user?.is_superuser) && (
                  <span className="px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-sm font-bold flex items-center space-x-1">
                    <FiShield className="w-4 h-4" />
                    <span>Admin View (All Organizations)</span>
                  </span>
                )}
              </div>
              <p className="text-gray-600 mt-2">
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
                className="px-6 py-2 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 transition-all flex items-center space-x-2 font-medium"
              >
                <FiClock className="w-4 h-4" />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-5 border-2 border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">
                    {changesOnlyFilter ? "Changes Detected" : "Total Checks"}
                  </p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{changes.length}</p>
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

            <div className="bg-white rounded-xl p-5 border-2 border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Critical</p>
                  <p className="text-3xl font-bold text-red-600 mt-1">{criticalCount + highCount}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                  <FiAlertCircle className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border-2 border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Pending Review</p>
                  <p className="text-3xl font-bold text-orange-600 mt-1">{unacknowledgedCount}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                  <FiClock className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border-2 border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Acknowledged</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">{actualChanges.length - unacknowledgedCount}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                  <FiCheck className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Info Banner for No Changes */}
          {!changesOnlyFilter && actualChanges.length === 0 && changes.length > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FiCheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">All Monitoring Checks Stable</h4>
                  <p className="text-gray-700 mt-1">
                    Showing {changes.length} monitoring check{changes.length !== 1 ? 's' : ''} with no changes detected. 
                    This means your competitors' pages are stable. Toggle to "Changes Only" to hide these.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Search and Filters */}
          <div className="bg-white rounded-xl border-2 border-gray-100 p-5">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search changes by summary, competitor, or business impact..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors bg-white text-gray-900 placeholder:text-gray-400"
                />
              </div>
              
              {/* Filters */}
              <div className="flex gap-3">
                <div className="flex items-center space-x-2">
                  <FiFilter className="text-gray-600 w-5 h-5" />
                  <select
                    className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors font-medium bg-white text-gray-900"
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
                  className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none transition-colors font-medium bg-white text-gray-900"
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
                      : "bg-white text-gray-700 border-gray-200 hover:border-blue-500"
                  }`}
                >
                  {changesOnlyFilter ? "Changes Only" : "All Checks"}
                </button>
              </div>
            </div>
          </div>

          {/* Changes List */}
          {filteredChanges.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <FiAlertCircle className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {changesOnlyFilter ? "No Changes Detected Yet" : "No Records Found"}
              </h3>
              <p className="text-gray-600">
                {searchTerm || severityFilter || acknowledgedFilter 
                  ? "No records match your search or filters."
                  : changesOnlyFilter
                    ? "Your monitoring checks haven't detected any changes yet. Try toggling to 'All Checks' to see monitoring activity."
                    : "Start monitoring competitors to see activity here."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredChanges.map((change) => (
                <div
                  key={change.id}
                  className="bg-white rounded-2xl border-2 border-gray-100 hover:border-blue-300 hover:shadow-xl transition-all p-6 group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Badges */}
                      <div className="flex items-center gap-3 mb-4 flex-wrap">
                        {/* Change Detection Badge */}
                        <span
                          className={`px-4 py-1.5 text-xs font-bold rounded-full border-2 ${
                            change.change_detected
                              ? "bg-gradient-to-r from-red-500 to-orange-500 text-white border-transparent"
                              : "bg-green-50 text-green-700 border-green-200"
                          }`}
                        >
                          {change.change_detected ? "⚠️ CHANGE DETECTED" : "✓ No Change"}
                        </span>
                        
                        <span
                          className={`px-4 py-1.5 text-xs font-bold rounded-full border-2 ${getSeverityColor(
                            change.severity
                          )}`}
                        >
                          <div className={`inline-block w-2 h-2 rounded-full bg-gradient-to-r ${getSeverityGradient(change.severity)} mr-2`}></div>
                          {change.severity.toUpperCase()}
                        </span>
                        
                        <span className="px-4 py-1.5 text-xs font-bold rounded-full bg-purple-50 text-purple-600 border-2 border-purple-200">
                          {change.change_type}
                        </span>
                        
                        <span className="px-4 py-1.5 text-xs font-bold rounded-full bg-gray-50 text-gray-700 border-2 border-gray-200">
                          {change.competitor_name}
                        </span>
                        
                        {change.acknowledged && (
                          <span className="px-4 py-1.5 text-xs font-bold rounded-full bg-green-50 text-green-700 border-2 border-green-200 flex items-center gap-2">
                            <FiCheck className="w-3 h-3" /> Acknowledged
                          </span>
                        )}
                      </div>

                      {/* Summary */}
                      <h3 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">
                        {change.summary}
                      </h3>

                      {/* Details: Business Impact and Recommended Action always shown */}
                      <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                          <div className="flex items-center space-x-2 mb-2">
                            <FiZap className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-bold text-blue-900">
                              Business Impact
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">
                            {change.business_impact?.trim() || "—"}
                          </p>
                        </div>
                        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-100">
                          <div className="flex items-center space-x-2 mb-2">
                            <FiCheck className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-bold text-green-900">
                              Recommended Action
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">
                            {change.recommended_action?.trim() || "—"}
                          </p>
                        </div>
                      </div>

                      {/* Diff preview */}
                      {change.diff_preview && (
                        <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="flex items-center space-x-2 mb-2">
                            <FiCode className="w-4 h-4 text-slate-600" />
                            <span className="text-sm font-bold text-slate-900">
                              Diff preview
                            </span>
                          </div>
                          <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono max-h-48 overflow-auto">
                            {change.diff_preview}
                          </pre>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center text-gray-500">
                          <FiClock className="w-4 h-4 mr-2" />
                          {format(new Date(change.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </div>
                        
                        <a
                          href={change.page_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center text-blue-600 hover:text-blue-700 font-medium"
                        >
                          View Page
                          <FiExternalLink className="w-4 h-4 ml-1" />
                        </a>
                      </div>
                    </div>

                    {/* Actions */}
                    {!change.acknowledged && (
                      <button
                        onClick={() => handleAcknowledge(change.id)}
                        className="ml-6 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg flex items-center space-x-2"
                      >
                        <FiCheck className="w-5 h-5" />
                        <span>Acknowledge</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
