"use client";

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { api, formatApiError } from "@/lib/api";
import { MonitoredPage, Competitor } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import { 
  FiPlus, FiEdit2, FiTrash2, FiRefreshCw, FiExternalLink,
  FiClock, FiCheckCircle, FiAlertCircle, FiSearch, FiFilter, FiShield
} from "react-icons/fi";
import { format } from "date-fns";
import { useToast } from "@/hooks/useToast";

export default function MonitoringPage() {
  const toast = useToast();
  const { user } = useAuth();
  const [pages, setPages] = useState<MonitoredPage[]>([]);
  const [filteredPages, setFilteredPages] = useState<MonitoredPage[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loadError, setLoadError] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  
  // Form state
  const [url, setUrl] = useState("");
  const [competitorId, setCompetitorId] = useState<number | "">("");
  const [pageType, setPageType] = useState("");
  const [checkFrequency, setCheckFrequency] = useState<"hourly" | "daily" | "weekly">("daily");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterPages();
  }, [pages, searchTerm, filterStatus]);

  const filterPages = () => {
    let filtered = pages;
    
    if (searchTerm) {
      filtered = filtered.filter(page =>
        page.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
        page.page_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        page.competitor_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterStatus !== "all") {
      filtered = filtered.filter(page =>
        filterStatus === "active" ? page.is_active : !page.is_active
      );
    }
    
    setFilteredPages(filtered);
  };

  const loadData = async () => {
    try {
      setLoadError("");
      const [pagesData, competitorsData] = await Promise.all([
        api.getMonitoredPages(),
        api.getCompetitors(),
      ]);
      setPages(pagesData);
      setCompetitors(competitorsData);
    } catch (error: any) {
      console.error("Failed to load data:", error);
      const status = error.response?.status;
      const fallback = status ? `Request failed (${status}). Please refresh the page.` : "Failed to load data. Please refresh the page.";
      setLoadError(formatApiError(error, fallback));
    } finally {
      setLoading(false);
    }
  };

  const handleAddPage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createMonitoredPage({
        url,
        competitor_id: Number(competitorId),
        page_type: pageType || undefined,
        check_frequency: checkFrequency,
        notes: notes || undefined,
      });
      setShowAddModal(false);
      resetForm();
      loadData();
      toast.success("Page added successfully! Monitoring will start automatically.");
    } catch (error: any) {
      toast.error(formatApiError(error, "Failed to add page"));
    }
  };

  const resetForm = () => {
    setUrl("");
    setCompetitorId("");
    setPageType("");
    setCheckFrequency("daily");
    setNotes("");
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to stop monitoring this page?")) return;
    
    try {
      await api.deleteMonitoredPage(id);
      loadData();
      toast.success("Page removed from monitoring successfully!");
    } catch (error: any) {
      toast.error(formatApiError(error, "Failed to delete page"));
    }
  };

  const handleCheckNow = async (id: number, url: string) => {
    try {
      await api.triggerPageCheck(id);
      toast.success("Check queued successfully! The page will be scraped in a few seconds.");
      toast.info("View results in the Changes page once processing completes.", 4000);
    } catch (error: any) {
      toast.error(formatApiError(error, "Failed to trigger check"));
    }
  };

  const getFrequencyBadge = (freq: string) => {
    const colors = {
      hourly: "bg-purple-100 text-purple-700 border-purple-200",
      daily: "bg-blue-100 text-blue-700 border-blue-200",
      weekly: "bg-green-100 text-green-700 border-green-200",
    };
    return colors[freq as keyof typeof colors] || colors.daily;
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Loading monitored pages...</p>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Monitored Pages
                </h1>
                {(user?.is_admin || user?.is_superuser) && (
                  <span className="px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-sm font-bold flex items-center space-x-1">
                    <FiShield className="w-4 h-4" />
                    <span>Admin View</span>
                  </span>
                )}
              </div>
              <p className="text-gray-600 mt-2">
                {(user?.is_admin || user?.is_superuser) 
                  ? "Viewing all monitored pages across all organizations" 
                  : "Track specific pages across competitor websites"}
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl flex items-center space-x-2"
              disabled={competitors.length === 0}
            >
              <FiPlus className="w-5 h-5" />
              <span>Add Page</span>
            </button>
          </div>

          {/* Error Alert */}
          {loadError && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <div className="flex items-start">
                <FiAlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-red-900">Error loading data</p>
                  <p className="text-sm text-red-700 mt-1">{loadError}</p>
                  <button 
                    onClick={loadData} 
                    className="mt-3 text-sm font-medium text-red-600 hover:text-red-700 underline"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border-2 border-gray-100 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-slate-400 font-medium">Total Pages</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{pages.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                  <FiClock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border-2 border-gray-100 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-slate-400 font-medium">Active</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                    {pages.filter(p => p.is_active).length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                  <FiCheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border-2 border-gray-100 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-slate-400 font-medium">Hourly Checks</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                    {pages.filter(p => p.check_frequency === 'hourly').length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                  <FiRefreshCw className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border-2 border-gray-100 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-slate-400 font-medium">Competitors</p>
                  <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{competitors.length}</p>
                </div>
                <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                  <FiExternalLink className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Empty States */}
          {competitors.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-12 text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full mx-auto mb-4 flex items-center justify-center">
                <FiAlertCircle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Add Competitors First</h3>
              <p className="text-gray-600 dark:text-slate-400 mb-6">
                You need to add competitors before you can monitor their pages.
              </p>
              <a 
                href="/competitors" 
                className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
              >
                Add Competitors
              </a>
            </div>
          ) : pages.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-12 text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mx-auto mb-4 flex items-center justify-center">
                <FiClock className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Start Monitoring</h3>
              <p className="text-gray-600 dark:text-slate-400 mb-6">
                Add your first page to start tracking competitor changes.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
              >
                Add Your First Page
              </button>
            </div>
          ) : (
            <>
              {/* Search and Filters */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border-2 border-gray-100 dark:border-slate-700 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search pages, titles, or competitors..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 dark:border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none transition-colors bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFilterStatus("all")}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        filterStatus === "all"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600"
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setFilterStatus("active")}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        filterStatus === "active"
                          ? "bg-green-600 text-white"
                          : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600"
                      }`}
                    >
                      Active
                    </button>
                    <button
                      onClick={() => setFilterStatus("inactive")}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        filterStatus === "inactive"
                          ? "bg-gray-600 text-white"
                          : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600"
                      }`}
                    >
                      Inactive
                    </button>
                  </div>
                </div>
              </div>

              {/* Pages List */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-700 border-b-2 border-gray-200 dark:border-slate-600">
                      <tr>
                        <th className="text-left py-4 px-6 text-sm font-bold text-gray-700 dark:text-slate-200">
                          Page
                        </th>
                        <th className="text-left py-4 px-6 text-sm font-bold text-gray-700 dark:text-slate-200">Competitor</th>
                        <th className="text-left py-4 px-6 text-sm font-bold text-gray-700 dark:text-slate-200">Type</th>
                        <th className="text-left py-4 px-6 text-sm font-bold text-gray-700 dark:text-slate-200">Frequency</th>
                        <th className="text-left py-4 px-6 text-sm font-bold text-gray-700 dark:text-slate-200">Last Checked</th>
                        <th className="text-left py-4 px-6 text-sm font-bold text-gray-700 dark:text-slate-200">Status</th>
                        <th className="text-right py-4 px-6 text-sm font-bold text-gray-700 dark:text-slate-200">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPages.map((page, index) => (
                        <tr 
                          key={page.id} 
                          className={`border-b border-gray-100 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-700/50 transition-colors ${
                            index % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-gray-50/50 dark:bg-slate-800/80'
                          }`}
                        >
                          <td className="py-4 px-6">
                            <a
                              href={page.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium group max-w-xs"
                              title={page.url}
                            >
                              <span className="truncate">{page.page_title || page.url}</span>
                              <FiExternalLink className="w-4 h-4 flex-shrink-0 group-hover:scale-110 transition-transform" />
                            </a>
                          </td>
                          <td className="py-4 px-6">
                            <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                              {page.competitor_name}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="px-3 py-1 text-xs font-bold rounded-full bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-600">
                              {page.page_type || "general"}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`px-3 py-1 text-xs font-bold rounded-full border ${getFrequencyBadge(page.check_frequency)}`}>
                              {page.check_frequency}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center text-sm text-gray-600 dark:text-slate-400">
                              <FiClock className="w-4 h-4 mr-2 text-gray-400 dark:text-slate-500" />
                              {page.last_checked_at
                                ? format(new Date(page.last_checked_at), "MMM d, h:mm a")
                                : "Never"}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span
                              className={`px-3 py-1 text-xs font-bold rounded-full border-2 ${
                                page.is_active
                                  ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700"
                                  : "bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-600"
                              }`}
                            >
                              {page.is_active ? "● Active" : "○ Inactive"}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleCheckNow(page.id, page.url)}
                                className="p-2 text-gray-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                                title="Check now"
                              >
                                <FiRefreshCw className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleDelete(page.id)}
                                className="p-2 text-gray-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                title="Delete"
                              >
                                <FiTrash2 className="w-5 h-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {filteredPages.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-slate-400">No pages match your filters</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Add Page Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-8 shadow-2xl border border-gray-200 dark:border-slate-700">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent mb-6">
                Add Monitored Page
              </h2>
              <form onSubmit={handleAddPage} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Page URL *</label>
                  <input
                    type="url"
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:border-blue-500 focus:outline-none transition-colors bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    required
                    placeholder="https://competitor.com/pricing"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Competitor *</label>
                  <select
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:border-blue-500 focus:outline-none transition-colors bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    value={competitorId}
                    onChange={(e) => setCompetitorId(e.target.value === "" ? "" : Number(e.target.value))}
                    required
                  >
                    <option value="">Select competitor...</option>
                    {competitors.map((comp) => (
                      <option key={comp.id} value={comp.id}>
                        {comp.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Page Type</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:border-blue-500 focus:outline-none transition-colors bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
                    value={pageType}
                    onChange={(e) => setPageType(e.target.value)}
                    placeholder="e.g., pricing, features, terms"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Check Frequency</label>
                  <select
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:border-blue-500 focus:outline-none transition-colors bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                    value={checkFrequency}
                    onChange={(e) => setCheckFrequency(e.target.value as any)}
                  >
                    <option value="hourly">Hourly - Real-time monitoring</option>
                    <option value="daily">Daily - Recommended</option>
                    <option value="weekly">Weekly - Cost-effective</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Notes (Optional)</label>
                  <textarea
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:border-blue-500 focus:outline-none transition-colors resize-none bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Any notes about this page..."
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                    className="flex-1 px-6 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-slate-600 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
                  >
                    Add Page
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </Layout>
    </ProtectedRoute>
  );
}
