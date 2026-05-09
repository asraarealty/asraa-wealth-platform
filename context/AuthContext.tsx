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

interface User {
  id: number;
  name?: string;
  email: string;
  role?: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetcher<User>("/auth/me")
      .then(setUser)
      .catch(() => {
        setUser(null);
        clearToken();
      })
      .finally(() => setLoading(false));
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

  const logout = useCallback(async () => {
    try {
      await fetcher("/auth/logout", { method: "POST" });
    } catch {}
    clearToken();
    setUser(null);
    window.location.href = "/login";
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
