"use client";

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { api, formatApiError } from "@/lib/api";
import { Competitor } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import { 
  FiPlus, FiEdit2, FiTrash2, FiExternalLink, FiSearch,
  FiGlobe, FiActivity, FiMonitor, FiCheckCircle, FiShield
} from "react-icons/fi";
import Link from "next/link";
import { useToast } from "@/hooks/useToast";
import Pagination from "@/components/Pagination";

export default function CompetitorsPage() {
  const toast = useToast();
  const { user } = useAuth();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [filteredCompetitors, setFilteredCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const competitorsPageSize = 12;
  
  // Form state
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    loadCompetitors();
  }, []);

  useEffect(() => {
    filterCompetitors();
  }, [competitors, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const filterCompetitors = () => {
    if (!searchTerm) {
      setFilteredCompetitors(competitors);
      return;
    }
    
    const filtered = competitors.filter(comp =>
      comp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comp.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comp.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCompetitors(filtered);
  };

  const loadCompetitors = async () => {
    try {
      const data = await api.getCompetitors();
      setCompetitors(data);
    } catch (error) {
      console.error("Failed to load competitors:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCompetitor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createCompetitor({ name, domain, description });
      setShowAddModal(false);
      setName("");
      setDomain("");
      setDescription("");
      loadCompetitors();
      toast.success(`Competitor "${name}" added successfully!`);
    } catch (error: any) {
      toast.error(formatApiError(error, "Failed to add competitor"));
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}? This will also remove all monitored pages for this competitor.`)) return;
    
    try {
      await api.deleteCompetitor(id);
      loadCompetitors();
      toast.success(`Competitor "${name}" deleted successfully!`);
    } catch (error: any) {
      toast.error(formatApiError(error, "Failed to delete competitor"));
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-slate-400 font-medium">Loading competitors...</p>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  const totalPages = competitors.reduce((sum, comp) => sum + (comp.monitored_pages_count || 0), 0);
  const activeCompetitors = competitors.filter(c => c.is_active).length;

  return (
    <ProtectedRoute>
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-3">
<h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                Competitors
              </h1>
                {(user?.is_admin || user?.is_superuser) && (
                  <span className="px-3 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg text-sm font-bold flex items-center space-x-1">
                    <FiShield className="w-4 h-4" />
                    <span>Admin View</span>
                  </span>
                )}
              </div>
              <p className="text-gray-600 dark:text-slate-400 mt-2">
                {(user?.is_admin || user?.is_superuser) 
                  ? "Viewing all competitors across all organizations" 
                  : "Manage the companies you're tracking"}
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl flex items-center space-x-2"
            >
              <FiPlus className="w-5 h-5" />
              <span>Add Competitor</span>
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border-2 border-gray-100 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-slate-400 font-medium">Total Competitors</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{competitors.length}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                  <FiGlobe className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border-2 border-gray-100 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-slate-400 font-medium">Active Tracking</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">{activeCompetitors}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                  <FiCheckCircle className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border-2 border-gray-100 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-slate-400 font-medium">Monitored Pages</p>
                  <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-1">{totalPages}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                  <FiMonitor className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          {competitors.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border-2 border-gray-100 dark:border-slate-700 p-4">
              <div className="relative">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search competitors by name, domain, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-lg focus:border-blue-500 focus:outline-none transition-colors bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
                />
              </div>
            </div>
          )}

          {/* Empty State */}
          {competitors.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full mx-auto mb-6 flex items-center justify-center">
                <FiGlobe className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Add Your First Competitor</h3>
              <p className="text-gray-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
                Start monitoring your competitors by adding them to your tracking list. 
                You'll be able to monitor their pricing pages, feature updates, and more.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-block px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg text-lg"
              >
                Add Your First Competitor
              </button>
            </div>
          ) : (
            <>
              {/* Competitors Grid */}
              {filteredCompetitors.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 p-12 text-center">
                  <p className="text-gray-500 dark:text-slate-400 text-lg">No competitors match your search</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCompetitors
                      .slice((currentPage - 1) * competitorsPageSize, currentPage * competitorsPageSize)
                      .map((competitor) => (
                    <div 
                      key={competitor.id} 
                      className="group bg-white dark:bg-slate-800 rounded-2xl border-2 border-gray-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-xl transition-all p-6"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                              <span className="text-white font-bold text-sm">
                                {competitor.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {competitor.name}
                            </h3>
                          </div>
                          <a
                            href={`https://${competitor.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-2 font-medium mt-2"
                          >
                            <FiGlobe className="w-4 h-4" />
                            {competitor.domain}
                            <FiExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <span
                          className={`px-3 py-1 text-xs font-bold rounded-full border-2 ${
                            competitor.is_active
                              ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700"
                              : "bg-gray-50 dark:bg-slate-700 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-600"
                          }`}
                        >
                          {competitor.is_active ? "● Active" : "○ Inactive"}
                        </span>
                      </div>

                      {competitor.description && (
                        <div className="mb-4 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg border border-gray-100 dark:border-slate-600">
                          <p className="text-sm text-gray-700 dark:text-slate-300 line-clamp-2">
                            {competitor.description}
                          </p>
                        </div>
                      )}

                      {/* Stats Bar */}
                      <div className="flex items-center justify-between py-3 px-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg mb-4 border border-blue-100 dark:border-blue-800">
                        <div className="flex items-center text-blue-700 dark:text-blue-400">
                          <FiMonitor className="w-4 h-4 mr-2" />
                          <span className="text-sm font-semibold">
                            {competitor.monitored_pages_count || 0} pages
                          </span>
                        </div>
                        <Link
                          href="/monitoring"
                          className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                        >
                          View →
                        </Link>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-4 border-t border-gray-100 dark:border-slate-700">
                        <Link
                          href={`/competitors/${competitor.id}`}
                          className="flex-1 px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition-all font-medium text-center flex items-center justify-center space-x-2"
                        >
                          <FiEdit2 className="w-4 h-4" />
                          <span>Edit</span>
                        </Link>
                        <button
                          onClick={() => handleDelete(competitor.id, competitor.name)}
                          className="flex-1 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-all font-medium flex items-center justify-center space-x-2"
                        >
                          <FiTrash2 className="w-4 h-4" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                      ))}
                  </div>
                  {filteredCompetitors.length > competitorsPageSize && (
                    <div className="mt-6 overflow-hidden rounded-2xl border-2 border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                      <Pagination
                        currentPage={currentPage}
                        totalPages={Math.ceil(filteredCompetitors.length / competitorsPageSize)}
                        totalItems={filteredCompetitors.length}
                        pageSize={competitorsPageSize}
                        onPageChange={setCurrentPage}
                        label="competitors"
                      />
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Add Competitor Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-8 shadow-2xl border border-gray-200 dark:border-slate-700">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center">
                  <FiPlus className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Add Competitor
                </h2>
              </div>
              
              <form onSubmit={handleAddCompetitor} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:border-blue-500 focus:outline-none transition-colors bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Acme Corp"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                    Domain *
                  </label>
                  <div className="relative">
                    <FiGlobe className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 w-5 h-5" />
                    <input
                      type="text"
                      className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:border-blue-500 focus:outline-none transition-colors bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      required
                      placeholder="acme.com"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-slate-500 mt-2">
                    Enter the domain without https://
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-xl focus:border-blue-500 focus:outline-none transition-colors resize-none bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Brief description about this competitor..."
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-6 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-slate-600 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
                  >
                    Add Competitor
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
