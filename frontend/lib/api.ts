/**
 * API client for ChangeSignal backend
 */
import axios, { AxiosInstance, AxiosRequestConfig } from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
const API_VERSION = process.env.NEXT_PUBLIC_API_VERSION || "v1";

/** Base URL used for API requests (for error messages / debugging). */
export const getApiBaseUrl = () => `${API_URL}/${API_VERSION}`;

/** Backend health check URL (same host, no /v1). Use to test if the API is reachable. */
export const getApiHealthUrl = () => `${API_URL}/health`;

// Helper function to format API errors
export function formatApiError(error: any, fallbackMessage: string): string {
  const detail = error.response?.data?.detail;
  if (Array.isArray(detail)) {
    // Handle validation errors from FastAPI
    const errorMessages = detail.map((e: any) => e.msg || e.message || String(e)).join(", ");
    return errorMessages || fallbackMessage;
  } else if (typeof detail === "string") {
    return detail;
  }
  return fallbackMessage;
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_URL}/${API_VERSION}`,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Unauthorized - clear token and redirect to login
          this.clearToken();
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
        } else if (error.response?.status === 402) {
          // Payment required – subscription expired or trial ended
          if (typeof window !== "undefined") {
            window.location.href = "/subscription?expired=1";
          }
        }
        return Promise.reject(error);
      }
    );
  }

  private getToken(): string | null {
    if (typeof window !== "undefined") {
      return localStorage.getItem("token");
    }
    return null;
  }

  public setToken(token: string): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("token", token);
    }
  }

  public clearToken(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.client.post("/auth/login", { email, password });
    if (response.data.access_token) {
      this.setToken(response.data.access_token);
      if (typeof window !== "undefined") {
        localStorage.setItem("user", JSON.stringify(response.data.user));
      }
    }
    return response.data;
  }

  async register(email: string, password: string, organizationId: number, fullName?: string) {
    const response = await this.client.post("/auth/register", {
      email,
      password,
      organization_id: organizationId,
      full_name: fullName,
    });
    if (response.data.access_token) {
      this.setToken(response.data.access_token);
      if (typeof window !== "undefined") {
        localStorage.setItem("user", JSON.stringify(response.data.user));
      }
    }
    return response.data;
  }

  async registerOrganization(data: {
    org_name: string;
    org_slug: string;
    user_email: string;
    user_password: string;
    user_full_name?: string;
  }) {
    const response = await this.client.post("/auth/organization/register", data);
    if (response.data.access_token) {
      this.setToken(response.data.access_token);
      if (typeof window !== "undefined") {
        localStorage.setItem("user", JSON.stringify(response.data.user));
      }
    }
    return response.data;
  }

  async getCurrentUser() {
    const response = await this.client.get("/auth/me");
    return response.data;
  }

  logout() {
    this.clearToken();
  }

  // Competitors endpoints
  async getCompetitors(params?: { skip?: number; limit?: number; is_active?: boolean }) {
    const response = await this.client.get("/competitors", { params });
    return response.data;
  }

  async getCompetitor(id: number) {
    const response = await this.client.get(`/competitors/${id}`);
    return response.data;
  }

  async createCompetitor(data: {
    name: string;
    domain: string;
    description?: string;
    logo_url?: string;
  }) {
    const response = await this.client.post("/competitors", data);
    return response.data;
  }

  async updateCompetitor(id: number, data: any) {
    const response = await this.client.patch(`/competitors/${id}`, data);
    return response.data;
  }

  async deleteCompetitor(id: number) {
    const response = await this.client.delete(`/competitors/${id}`);
    return response.data;
  }

  async getCompetitorStats(id: number) {
    const response = await this.client.get(`/competitors/${id}/stats`);
    return response.data;
  }

  // Monitored pages endpoints
  async getMonitoredPages(params?: {
    skip?: number;
    limit?: number;
    competitor_id?: number;
    is_active?: boolean;
  }) {
    const response = await this.client.get("/pages", { params });
    return response.data;
  }

  async getMonitoredPage(id: number) {
    const response = await this.client.get(`/pages/${id}`);
    return response.data;
  }

  async createMonitoredPage(data: {
    url: string;
    competitor_id: number;
    page_title?: string;
    page_type?: string;
    check_frequency?: string;
    notes?: string;
  }) {
    const response = await this.client.post("/pages", data);
    return response.data;
  }

  async updateMonitoredPage(id: number, data: any) {
    const response = await this.client.patch(`/pages/${id}`, data);
    return response.data;
  }

  async deleteMonitoredPage(id: number) {
    const response = await this.client.delete(`/pages/${id}`);
    return response.data;
  }

  async triggerPageCheck(id: number) {
    const response = await this.client.post(`/pages/${id}/check`);
    return response.data;
  }

  // Change events endpoints
  async getChangeEvents(params?: {
    skip?: number;
    limit?: number;
    severity?: string;
    change_type?: string;
    acknowledged?: boolean;
    competitor_id?: number;
    monitored_page_id?: number;
    date_from?: string;
    date_to?: string;
    changes_only?: boolean;
  }) {
    const response = await this.client.get("/changes/", { params });
    return response.data;
  }

  async getChangeEvent(id: number) {
    const response = await this.client.get(`/changes/${id}`);
    return response.data;
  }

  async getSnapshotScreenshot(snapshotId: number): Promise<Blob> {
    const response = await this.client.get(`/snapshots/${snapshotId}/screenshot`, {
      responseType: "blob",
    });
    return response.data;
  }

  async updateChangeEvent(id: number, data: { acknowledged?: boolean }) {
    const response = await this.client.patch(`/changes/${id}`, data);
    return response.data;
  }

  async getChangeSummary(days: number = 7, changesOnly: boolean = false) {
    const response = await this.client.get("/changes/stats/summary", {
      params: { days, changes_only: changesOnly },
    });
    return response.data;
  }

  // Organization endpoints
  async getMyOrganization() {
    const response = await this.client.get("/organizations/me");
    return response.data;
  }

  async updateOrganization(id: number, data: any) {
    const response = await this.client.patch(`/organizations/${id}`, data);
    return response.data;
  }

  // Analytics endpoints
  async getAnalyticsTrends(days: number = 30, changesOnly: boolean = false) {
    const response = await this.client.get("/analytics/trends", {
      params: { days, changes_only: changesOnly },
    });
    return response.data;
  }

  async getAnalyticsInsights() {
    const response = await this.client.get("/analytics/insights");
    return response.data;
  }

  async getActivityFeed(limit: number = 50) {
    const response = await this.client.get("/analytics/activity-feed", {
      params: { limit },
    });
    return response.data;
  }

  async exportChangesCSV(startDate?: string, endDate?: string) {
    const params: any = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    
    const response = await this.client.get("/analytics/export/csv", {
      params,
      responseType: "blob",
    });
    return response.data;
  }

  // Comments endpoints
  async getCommentsForChange(changeEventId: number) {
    const response = await this.client.get(`/comments/change-event/${changeEventId}`);
    return response.data;
  }

  async createComment(changeEventId: number, content: string) {
    const response = await this.client.post("/comments", {
      change_event_id: changeEventId,
      content,
    });
    return response.data;
  }

  async deleteComment(commentId: number) {
    const response = await this.client.delete(`/comments/${commentId}`);
    return response.data;
  }

  // Notification preferences endpoints
  async getNotificationPreferences() {
    const response = await this.client.get("/notifications/preferences");
    return response.data;
  }

  async updateNotificationPreferences(data: any) {
    const response = await this.client.put("/notifications/preferences", data);
    return response.data;
  }

  // Admin endpoints
  async adminGetAllUsers(skip?: number, limit?: number, search?: string, subscriptionStatus?: string) {
    const params: any = {};
    if (skip !== undefined) params.skip = skip;
    if (limit !== undefined) params.limit = limit;
    if (search) params.search = search;
    if (subscriptionStatus) params.subscription_status = subscriptionStatus;
    
    const response = await this.client.get("/admin/users", { params });
    return response.data;
  }

  async adminGetUser(userId: number) {
    const response = await this.client.get(`/admin/users/${userId}`);
    return response.data;
  }

  async adminUpdateUser(userId: number, data: { is_admin?: boolean; is_active?: boolean }) {
    const response = await this.client.patch(`/admin/users/${userId}`, data);
    return response.data;
  }

  async adminUpdateUserSubscription(userId: number, data: any) {
    const response = await this.client.patch(`/admin/users/${userId}/subscription`, data);
    return response.data;
  }

  async adminGetSystemStats() {
    const response = await this.client.get("/admin/stats");
    return response.data;
  }

  async adminGetAllFeedback(skip?: number, limit?: number, statusFilter?: string) {
    const params: any = {};
    if (skip !== undefined) params.skip = skip;
    if (limit !== undefined) params.limit = limit;
    if (statusFilter) params.status_filter = statusFilter;
    
    const response = await this.client.get("/admin/feedback", { params });
    return response.data;
  }

  async adminUpdateFeedback(feedbackId: number, data: any) {
    const response = await this.client.patch(`/admin/feedback/${feedbackId}`, data);
    return response.data;
  }

  async adminGetSystemActivity(skip?: number, limit?: number, userId?: number) {
    const params: any = {};
    if (skip !== undefined) params.skip = skip;
    if (limit !== undefined) params.limit = limit;
    if (userId) params.user_id = userId;
    
    const response = await this.client.get("/admin/activity", { params });
    return response.data;
  }

  async adminGetConfig() {
    const response = await this.client.get("/admin/config");
    return response.data;
  }

  async adminUpdateConfig(data: any) {
    const response = await this.client.patch("/admin/config", data);
    return response.data;
  }

  // Feedback endpoints (user-facing)
  async submitFeedback(data: { subject: string; description: string; category: string }) {
    const response = await this.client.post("/feedback/", data);
    return response.data;
  }

  async getMyFeedback() {
    const response = await this.client.get("/feedback/my");
    return response.data;
  }

  async getFeedback(feedbackId: number) {
    const response = await this.client.get(`/feedback/${feedbackId}`);
    return response.data;
  }

  // Subscription endpoints
  async getSubscriptionStatus() {
    const response = await this.client.get("/subscription/status");
    return response.data;
  }

  async createCheckoutSession(successUrl: string, cancelUrl: string) {
    const response = await this.client.post("/subscription/create-checkout-session", {
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
    return response.data;
  }

  async cancelSubscription() {
    const response = await this.client.post("/subscription/cancel");
    return response.data;
  }

  async reactivateSubscription() {
    const response = await this.client.post("/subscription/reactivate");
    return response.data;
  }
}

// Export singleton instance
export const api = new ApiClient();
