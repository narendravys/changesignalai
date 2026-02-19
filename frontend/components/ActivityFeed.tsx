"use client";

import { useState, useEffect } from "react";
import { api, formatApiError } from "@/lib/api";
import { FiActivity, FiAlertCircle, FiPlus, FiCheck, FiMessageCircle } from "react-icons/fi";
import { format } from "date-fns";

interface ActivityFeedProps {
  limit?: number;
  showTitle?: boolean;
}

export default function ActivityFeed({ limit = 20, showTitle = true }: ActivityFeedProps) {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadActivities();
  }, [limit]);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const data = await api.getActivityFeed(limit);
      setActivities(data);
      setError("");
    } catch (err: any) {
      setError(formatApiError(err, "Failed to load activity feed"));
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (actionType: string) => {
    switch (actionType) {
      case "change_detected":
        return <FiAlertCircle className="w-5 h-5 text-orange-600" />;
      case "page_added":
        return <FiPlus className="w-5 h-5 text-blue-600" />;
      case "change_acknowledged":
        return <FiCheck className="w-5 h-5 text-green-600" />;
      case "comment_added":
        return <FiMessageCircle className="w-5 h-5 text-purple-600" />;
      default:
        return <FiActivity className="w-5 h-5 text-gray-600" />;
    }
  };

  const getActivityColor = (actionType: string) => {
    switch (actionType) {
      case "change_detected":
        return "border-orange-200 bg-orange-50";
      case "page_added":
        return "border-blue-200 bg-blue-50";
      case "change_acknowledged":
        return "border-green-200 bg-green-50";
      case "comment_added":
        return "border-purple-200 bg-purple-50";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border-2 border-gray-100">
        {showTitle && <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>}
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl p-6 border-2 border-gray-100">
        {showTitle && <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>}
        <div className="text-center py-8">
          <FiAlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 border-2 border-gray-100">
        {showTitle && <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>}
        <div className="text-center py-8">
          <FiActivity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No activity yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 border-2 border-gray-100">
      {showTitle && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
          <button
            onClick={loadActivities}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Refresh
          </button>
        </div>
      )}
      
      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className={`flex items-start p-3 rounded-lg border-2 ${getActivityColor(activity.action_type)} hover:shadow-md transition-all`}
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-white shadow-sm">
              {getActivityIcon(activity.action_type)}
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 leading-relaxed">
                {activity.description}
              </p>
              {activity.metadata && (
                <div className="mt-1 flex flex-wrap gap-2">
                  {activity.metadata.competitor_name && (
                    <span className="text-xs px-2 py-1 bg-white rounded-md font-medium text-gray-700 border border-gray-200">
                      {activity.metadata.competitor_name}
                    </span>
                  )}
                  {activity.metadata.severity && (
                    <span className={`text-xs px-2 py-1 rounded-md font-bold ${
                      activity.metadata.severity === "critical" ? "bg-red-100 text-red-700" :
                      activity.metadata.severity === "high" ? "bg-orange-100 text-orange-700" :
                      activity.metadata.severity === "medium" ? "bg-yellow-100 text-yellow-700" :
                      "bg-blue-100 text-blue-700"
                    }`}>
                      {activity.metadata.severity.toUpperCase()}
                    </span>
                  )}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1.5">
                {format(new Date(activity.created_at), "MMM d, h:mm a")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
