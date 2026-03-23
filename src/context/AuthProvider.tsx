import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { loginRequest, meRequest, refreshRequest } from "../api/auth";
import type { MeResponse } from "../types/auth";
import { AuthContext } from "./AuthContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
  }, []);

  const refreshMe = useCallback(async () => {
    const accessToken = localStorage.getItem("accessToken");
    const refreshToken = localStorage.getItem("refreshToken");

    if (!accessToken && !refreshToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const me = await meRequest();
      setUser(me);
    } catch {
      if (!refreshToken) {
        logout();
        setIsLoading(false);
        return;
      }

      try {
        const refreshed = await refreshRequest(refreshToken);
        localStorage.setItem("accessToken", refreshed.access);
        const me = await meRequest();
        setUser(me);
      } catch {
        logout();
      }
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  const login = useCallback(async (username: string, password: string) => {
    const data = await loginRequest(username, password);
    localStorage.setItem("accessToken", data.access);
    localStorage.setItem("refreshToken", data.refresh);

    const me = await meRequest();
    setUser(me);
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      refreshMe,
    }),
    [user, isLoading, login, logout, refreshMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}