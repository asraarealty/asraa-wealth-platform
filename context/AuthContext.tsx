"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { fetcher, setToken, clearToken } from "@/lib/fetcher";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "suspended";

export interface User {
  id: number;
  name?: string;
  email: string;
  role?: string;
  approval_status?: ApprovalStatus;
}

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: (nextPath?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    let mounted = true;

    fetcher<User>("/auth/me", { signal: controller.signal })
      .then((me) => {
        if (!mounted) return;
        setUser(me);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (!mounted) return;
        setUser(null);
        clearToken();
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
      controller.abort();
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetcher<{ access_token?: string }>("/auth/login", {
      method: "POST",
      body: { email, password },
      raw: true,
    });

    if (res.access_token) {
      setToken(res.access_token);
    }

    const me = await fetcher<User>("/auth/me");
    setUser(me);

    return me;
  }, []);

  const logout = useCallback(async (nextPath = "/login") => {
    try {
      await fetcher("/auth/logout", { method: "POST" });
    } catch {}
    clearToken();
    setUser(null);
    if (typeof window !== "undefined" && window.location.pathname !== nextPath) {
      window.location.assign(nextPath);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
