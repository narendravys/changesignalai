"use client";

import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { api, formatApiError } from "@/lib/api";
import { FiBell, FiMail, FiGlobe, FiSave, FiCheck } from "react-icons/fi";
import { useToast } from "@/hooks/useToast";

export default function SettingsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Notification preferences
  const [preferences, setPreferences] = useState<any>({
    email_enabled: true,
    webhook_enabled: false,
    webhook_url: "",
    critical_changes: true,
    high_changes: true,
    medium_changes: false,
    low_changes: false,
    daily_digest: false,
    weekly_digest: true,
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const data = await api.getNotificationPreferences();
      setPreferences(data);
    } catch (error: any) {
      toast.error(formatApiError(error, "Failed to load settings"));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.updateNotificationPreferences(preferences);
      toast.success("Settings saved successfully!");
    } catch (error: any) {
      toast.error(formatApiError(error, "Failed to save settings"));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (field: string) => {
    setPreferences((prev: any) => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const handleChange = (field: string, value: any) => {
    setPreferences((prev: any) => ({
      ...prev,
      [field]: value,
    }));
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Loading settings...</p>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                ⚙️ Notification Settings
              </h1>
              <p className="text-gray-600 mt-2">
                Configure how and when you receive notifications about changes
              </p>
            </div>
            
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <FiSave className="w-5 h-5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>

          {/* Email Notifications */}
          <div className="bg-white rounded-xl p-6 border-2 border-gray-100">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                <FiMail className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Email Notifications</h3>
                <p className="text-sm text-gray-600">Receive alerts via email</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Enable Email */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-900">Enable Email Notifications</p>
                  <p className="text-sm text-gray-600 mt-1">Receive email alerts for changes</p>
                </div>
                <button
                  onClick={() => handleToggle("email_enabled")}
                  className={`relative w-14 h-8 rounded-full transition-all ${
                    preferences.email_enabled ? "bg-green-500" : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                      preferences.email_enabled ? "translate-x-6" : ""
                    }`}
                  ></div>
                </button>
              </div>

              {/* Severity Triggers */}
              {preferences.email_enabled && (
                <div className="space-y-3 pl-4 border-l-4 border-blue-200">
                  <p className="font-semibold text-gray-700 text-sm">Alert me for these severities:</p>
                  
                  {["critical_changes", "high_changes", "medium_changes", "low_changes"].map((field) => {
                    const labels: any = {
                      critical_changes: { name: "Critical", color: "text-red-600", desc: "Immediate attention required" },
                      high_changes: { name: "High", color: "text-orange-600", desc: "Important changes" },
                      medium_changes: { name: "Medium", color: "text-yellow-600", desc: "Notable changes" },
                      low_changes: { name: "Low", color: "text-blue-600", desc: "Minor changes" },
                    };
                    const label = labels[field];
                    
                    return (
                      <label key={field} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors cursor-pointer">
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={preferences[field]}
                            onChange={() => handleToggle(field)}
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div>
                            <span className={`font-semibold ${label.color}`}>{label.name}</span>
                            <p className="text-xs text-gray-500 mt-0.5">{label.desc}</p>
                          </div>
                        </div>
                        {preferences[field] && (
                          <FiCheck className="w-5 h-5 text-green-500" />
                        )}
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Digest Options */}
              {preferences.email_enabled && (
                <div className="space-y-3 pl-4 border-l-4 border-purple-200">
                  <p className="font-semibold text-gray-700 text-sm">Email Digests:</p>
                  
                  <label className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={preferences.daily_digest}
                        onChange={() => handleToggle("daily_digest")}
                        className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <div>
                        <span className="font-semibold text-gray-900">Daily Digest</span>
                        <p className="text-xs text-gray-500 mt-0.5">Summary every morning</p>
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={preferences.weekly_digest}
                        onChange={() => handleToggle("weekly_digest")}
                        className="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <div>
                        <span className="font-semibold text-gray-900">Weekly Digest</span>
                        <p className="text-xs text-gray-500 mt-0.5">Summary every Monday</p>
                      </div>
                    </div>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Webhook Notifications */}
          <div className="bg-white rounded-xl p-6 border-2 border-gray-100">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                <FiGlobe className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Webhook Integration</h3>
                <p className="text-sm text-gray-600">Send notifications to external services</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Enable Webhook */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-900">Enable Webhooks</p>
                  <p className="text-sm text-gray-600 mt-1">Send POST requests to your endpoint</p>
                </div>
                <button
                  onClick={() => handleToggle("webhook_enabled")}
                  className={`relative w-14 h-8 rounded-full transition-all ${
                    preferences.webhook_enabled ? "bg-green-500" : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                      preferences.webhook_enabled ? "translate-x-6" : ""
                    }`}
                  ></div>
                </button>
              </div>

              {/* Webhook URL */}
              {preferences.webhook_enabled && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Webhook URL
                  </label>
                  <input
                    type="url"
                    value={preferences.webhook_url || ""}
                    onChange={(e) => handleChange("webhook_url", e.target.value)}
                    placeholder="https://your-app.com/api/webhook"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none transition-colors bg-white text-gray-900 placeholder:text-gray-400"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    📝 Perfect for Slack, Discord, or custom integrations
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5">
            <div className="flex items-start">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <FiBell className="w-6 h-6 text-white" />
              </div>
              <div className="ml-4">
                <h4 className="font-bold text-gray-900">💡 Pro Tips</h4>
                <ul className="text-sm text-gray-700 mt-2 space-y-1">
                  <li>• Enable Critical & High alerts to stay on top of important changes</li>
                  <li>• Use webhooks to integrate with Slack, Discord, or your CRM</li>
                  <li>• Weekly digests are perfect for staying informed without email overload</li>
                  <li>• Test your webhook URL before saving to ensure it works correctly</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom Save Button */}
          <div className="sticky bottom-6 z-10">
            <div className="bg-white rounded-xl border-2 border-gray-200 shadow-2xl p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 font-medium">
                  Don't forget to save your notification preferences
                </p>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 font-semibold text-lg"
                >
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <FiSave className="w-5 h-5" />
                      <span>Save All Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
