"use client";

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { 
  FiUsers, FiDollarSign, FiActivity, FiMessageSquare, 
  FiSettings, FiSearch, FiEdit, FiCheck, FiX, FiClock,
  FiTrendingUp, FiAlertCircle, FiBarChart2
} from "react-icons/fi";
import { formatDistanceToNow } from "date-fns";

export default function AdminDashboard() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "feedback" | "activity" | "config">("overview");
  const [loading, setLoading] = useState(true);
  
  // Overview data
  const [stats, setStats] = useState<any>(null);
  
  // Users data
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [extendDays, setExtendDays] = useState("");
  const [reduceDays, setReduceDays] = useState("");
  
  // Feedback data
  const [feedback, setFeedback] = useState<any[]>([]);
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");
  
  // Activity data
  const [activity, setActivity] = useState<any[]>([]);
  
  // Config data
  const [config, setConfig] = useState<any>(null);
  const [configEdit, setConfigEdit] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === "overview") {
        const statsData = await api.adminGetSystemStats();
        setStats(statsData);
      } else if (activeTab === "users") {
        const usersData = await api.adminGetAllUsers(0, 100, userSearch);
        setUsers(usersData);
      } else if (activeTab === "feedback") {
        const feedbackData = await api.adminGetAllFeedback(0, 100);
        setFeedback(feedbackData);
      } else if (activeTab === "activity") {
        const activityData = await api.adminGetSystemActivity(0, 100);
        setActivity(activityData);
      } else if (activeTab === "config") {
        const configData = await api.adminGetConfig();
        setConfig(configData);
        setConfigEdit(configData);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  const handleExtendSubscription = async (userId: number) => {
    const days = parseInt(extendDays, 10);
    if (!extendDays || isNaN(days) || days <= 0) {
      toast.error("Please enter a valid positive number of days");
      return;
    }
    try {
      await api.adminUpdateUserSubscription(userId, { extend_days: days });
      toast.success("Subscription extended successfully!");
      setExtendDays("");
      setSelectedUser(null);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to extend subscription");
    }
  };

  const handleReduceTrial = async (userId: number) => {
    const days = parseInt(reduceDays, 10);
    if (!reduceDays || isNaN(days) || days <= 0) {
      toast.error("Please enter a valid positive number of days to reduce");
      return;
    }
    try {
      await api.adminUpdateUserSubscription(userId, { extend_days: -days });
      toast.success("Trial reduced successfully!");
      setReduceDays("");
      setSelectedUser(null);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to reduce trial");
    }
  };

  const handleResolveFeedback = async (feedbackId: number) => {
    try {
      await api.adminUpdateFeedback(feedbackId, {
        status: "resolved",
        admin_notes: adminNotes,
      });
      toast.success("Feedback resolved!");
      setSelectedFeedback(null);
      setAdminNotes("");
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to resolve feedback");
    }
  };

  const handleUpdateConfig = async () => {
    try {
      await api.adminUpdateConfig(configEdit);
      toast.success("Configuration updated successfully!");
      setConfig(configEdit);
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to update configuration");
    }
  };

  return (
    <ProtectedRoute adminOnly>
      <Layout>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-gray-600 mt-2">Manage users, subscriptions, feedback, and system configuration</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-2 border-b-2 border-gray-200">
            {[
              { id: "overview", label: "Overview", icon: FiBarChart2 },
              { id: "users", label: "Users", icon: FiUsers },
              { id: "feedback", label: "Feedback", icon: FiMessageSquare },
              { id: "activity", label: "Activity", icon: FiActivity },
              { id: "config", label: "Configuration", icon: FiSettings },
            ].map((tab: any) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-3 font-semibold transition-all ${
                  activeTab === tab.id
                    ? "border-b-4 border-purple-600 text-purple-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === "overview" && stats && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                      <div className="flex items-center justify-between">
                        <FiUsers className="w-12 h-12 opacity-80" />
                        <div className="text-right">
                          <p className="text-3xl font-bold">{stats.total_users}</p>
                          <p className="text-sm opacity-90">Total Users</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
                      <div className="flex items-center justify-between">
                        <FiDollarSign className="w-12 h-12 opacity-80" />
                        <div className="text-right">
                          <p className="text-3xl font-bold">${stats.revenue_potential_monthly}</p>
                          <p className="text-sm opacity-90">Monthly Revenue</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                      <div className="flex items-center justify-between">
                        <FiTrendingUp className="w-12 h-12 opacity-80" />
                        <div className="text-right">
                          <p className="text-3xl font-bold">{stats.paid_users}</p>
                          <p className="text-sm opacity-90">Paid Subscriptions</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
                      <div className="flex items-center justify-between">
                        <FiAlertCircle className="w-12 h-12 opacity-80" />
                        <div className="text-right">
                          <p className="text-3xl font-bold">{stats.total_feedback_open}</p>
                          <p className="text-sm opacity-90">Open Feedback</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
                      <h3 className="font-bold text-gray-900 mb-4">User Breakdown</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Trial Users:</span>
                          <span className="font-bold text-blue-600">{stats.trial_users}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Paid Users:</span>
                          <span className="font-bold text-green-600">{stats.paid_users}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Expired Users:</span>
                          <span className="font-bold text-red-600">{stats.expired_users}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
                      <h3 className="font-bold text-gray-900 mb-4">System Stats</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Organizations:</span>
                          <span className="font-bold">{stats.total_organizations}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Competitors:</span>
                          <span className="font-bold">{stats.total_competitors}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Monitored Pages:</span>
                          <span className="font-bold">{stats.total_monitored_pages}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
                      <h3 className="font-bold text-gray-900 mb-4">Change Events</h3>
                      <div className="text-center">
                        <p className="text-5xl font-bold text-purple-600">{stats.total_change_events}</p>
                        <p className="text-gray-600 mt-2">Total Detected</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Users Tab */}
              {activeTab === "users" && (
                <div className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <div className="relative flex-1">
                      <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search users by email or name..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && loadData()}
                        className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none bg-white text-gray-900 placeholder:text-gray-400"
                      />
                    </div>
                    <button
                      onClick={loadData}
                      className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-semibold"
                    >
                      Search
                    </button>
                  </div>

                  <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">User</th>
                            <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Organization</th>
                            <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Status</th>
                            <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Subscription</th>
                            <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {users.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4">
                                <div>
                                  <p className="font-semibold text-gray-900">{user.full_name || "N/A"}</p>
                                  <p className="text-sm text-gray-600">{user.email}</p>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-gray-900">{user.organization_name}</td>
                              <td className="px-6 py-4">
                                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                  user.subscription_status === "trial" ? "bg-blue-100 text-blue-700" :
                                  user.subscription_status === "active" ? "bg-green-100 text-green-700" :
                                  "bg-red-100 text-red-700"
                                }`}>
                                  {user.subscription_status}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <p className="text-sm text-gray-600">
                                  {user.trial_ends_at ? `Trial: ${formatDistanceToNow(new Date(user.trial_ends_at), { addSuffix: true })}` :
                                   user.subscription_ends_at ? `Ends: ${formatDistanceToNow(new Date(user.subscription_ends_at), { addSuffix: true })}` :
                                   "No expiry set"}
                                </p>
                              </td>
                              <td className="px-6 py-4">
                                <button
                                  onClick={() => setSelectedUser(user)}
                                  className="text-purple-600 hover:text-purple-800 font-semibold"
                                >
                                  <FiEdit className="w-5 h-5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* User Edit Modal */}
                  {selectedUser && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                      <div className="bg-white rounded-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                          <h3 className="text-2xl font-bold">Manage User Subscription</h3>
                          <button onClick={() => setSelectedUser(null)} className="text-gray-500 hover:text-gray-700">
                            <FiX className="w-6 h-6" />
                          </button>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <p><strong>Email:</strong> {selectedUser.email}</p>
                            <p><strong>Name:</strong> {selectedUser.full_name}</p>
                            <p><strong>Status:</strong> {selectedUser.subscription_status}</p>
                            {selectedUser.trial_ends_at && (
                              <p className="text-sm text-gray-600 mt-1">
                                Trial ends: {formatDistanceToNow(new Date(selectedUser.trial_ends_at), { addSuffix: true })}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Extend subscription (days)
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={extendDays}
                              onChange={(e) => setExtendDays(e.target.value)}
                              placeholder="e.g. 7"
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none bg-white text-gray-900 placeholder:text-gray-400"
                            />
                            <button
                              onClick={() => handleExtendSubscription(selectedUser.id)}
                              className="w-full mt-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-semibold"
                            >
                              Extend subscription
                            </button>
                          </div>
                          {selectedUser.subscription_status === "trial" && (
                            <div className="pt-4 border-t border-gray-200">
                              <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Reduce trial (days)
                              </label>
                              <p className="text-xs text-gray-500 mb-2">
                                Shorten this user&apos;s trial by moving the end date earlier. Use a positive number (e.g. 5 to remove 5 days).
                              </p>
                              <input
                                type="number"
                                min="1"
                                value={reduceDays}
                                onChange={(e) => setReduceDays(e.target.value)}
                                placeholder="e.g. 5"
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:outline-none bg-white text-gray-900 placeholder:text-gray-400"
                              />
                              <button
                                onClick={() => handleReduceTrial(selectedUser.id)}
                                className="w-full mt-2 px-6 py-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors font-semibold"
                              >
                                Reduce trial
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Feedback Tab */}
              {activeTab === "feedback" && (
                <div className="space-y-6">
                  <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">User</th>
                            <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Subject</th>
                            <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Category</th>
                            <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Status</th>
                            <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Created</th>
                            <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {feedback.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 text-gray-900">{item.user_email}</td>
                              <td className="px-6 py-4">
                                <p className="font-semibold text-gray-900">{item.subject}</p>
                                <p className="text-sm text-gray-600 truncate max-w-xs">{item.description}</p>
                              </td>
                              <td className="px-6 py-4">
                                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-semibold">
                                  {item.category}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                  item.status === "open" ? "bg-yellow-100 text-yellow-700" :
                                  item.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                                  item.status === "resolved" ? "bg-green-100 text-green-700" :
                                  "bg-gray-100 text-gray-700"
                                }`}>
                                  {item.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">
                                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                              </td>
                              <td className="px-6 py-4">
                                <button
                                  onClick={() => {
                                    setSelectedFeedback(item);
                                    setAdminNotes(item.admin_notes || "");
                                  }}
                                  className="text-purple-600 hover:text-purple-800 font-semibold"
                                >
                                  <FiEdit className="w-5 h-5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Feedback Edit Modal */}
                  {selectedFeedback && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                      <div className="bg-white rounded-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                          <h3 className="text-2xl font-bold">Manage Feedback</h3>
                          <button onClick={() => setSelectedFeedback(null)} className="text-gray-500 hover:text-gray-700">
                            <FiX className="w-6 h-6" />
                          </button>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <p><strong>From:</strong> {selectedFeedback.user_email}</p>
                            <p><strong>Subject:</strong> {selectedFeedback.subject}</p>
                            <p><strong>Category:</strong> {selectedFeedback.category}</p>
                            <p className="mt-2"><strong>Description:</strong></p>
                            <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedFeedback.description}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Admin Notes
                            </label>
                            <textarea
                              value={adminNotes}
                              onChange={(e) => setAdminNotes(e.target.value)}
                              placeholder="Enter resolution notes..."
                              rows={4}
                              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none bg-white text-gray-900 placeholder:text-gray-400"
                            />
                          </div>
                          <button
                            onClick={() => handleResolveFeedback(selectedFeedback.id)}
                            className="w-full px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold flex items-center justify-center space-x-2"
                          >
                            <FiCheck className="w-5 h-5" />
                            <span>Mark as Resolved</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Activity Tab */}
              {activeTab === "activity" && (
                <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">System Activity Log</h3>
                  <div className="space-y-4">
                    {activity.map((log, index) => (
                      <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                        <FiClock className="w-5 h-5 text-gray-400 mt-1" />
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{log.user_email}</p>
                          <p className="text-gray-700">{log.description}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Configuration Tab */}
              {activeTab === "config" && config && (
                <div className="bg-white rounded-xl border-2 border-gray-200 p-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Subscription Configuration</h3>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Trial period (days)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={90}
                          value={configEdit.trial_period_days}
                          onChange={(e) => setConfigEdit({ ...configEdit, trial_period_days: parseInt(e.target.value) || 0 })}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none bg-white text-gray-900"
                        />
                        <p className="text-xs text-gray-500 mt-1">Default for new signups. Decrease to give new users fewer trial days.</p>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Monthly Price ($)
                        </label>
                        <input
                          type="number"
                          value={configEdit.monthly_price}
                          onChange={(e) => setConfigEdit({ ...configEdit, monthly_price: parseInt(e.target.value) })}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none bg-white text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Max Competitors
                        </label>
                        <input
                          type="number"
                          value={configEdit.max_competitors}
                          onChange={(e) => setConfigEdit({ ...configEdit, max_competitors: parseInt(e.target.value) })}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none bg-white text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Max Monitored Pages
                        </label>
                        <input
                          type="number"
                          value={configEdit.max_monitored_pages}
                          onChange={(e) => setConfigEdit({ ...configEdit, max_monitored_pages: parseInt(e.target.value) })}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none bg-white text-gray-900"
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleUpdateConfig}
                      className="w-full px-6 py-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-semibold text-lg"
                    >
                      Save Configuration
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
