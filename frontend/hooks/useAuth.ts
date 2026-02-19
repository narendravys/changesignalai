/**
 * Authentication hook
 */
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, formatApiError } from "@/lib/api";
import { User } from "@/lib/types";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }

      const userData = await api.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error("Auth check failed:", error);
      api.clearToken();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const data = await api.login(email, password);
      setUser(data.user);
      router.push("/dashboard");
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: formatApiError(error, "Login failed"),
      };
    }
  };

  const logout = () => {
    api.logout();
    setUser(null);
    router.push("/login");
  };

  return {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  };
}
