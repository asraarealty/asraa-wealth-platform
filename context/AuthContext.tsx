"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
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
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ Restore session (TOKEN BASED)
  useEffect(() => {
    let cancelled = false;

    fetcher<User>("/auth/me")
      .then((data) => {
        if (!cancelled) setUser(data);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // ✅ Login (store token)
  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetcher<{ access_token: string }>("/auth/login", {
        method: "POST",
        body: { email, password },
        raw: true,
      });

      // 🔥 CRITICAL
      setToken(res.access_token);

      // Fetch user after login
      const me = await fetcher<User>("/auth/me");
      setUser(me);

      router.replace(me.role === "admin" ? "/admin" : "/dashboard");
    },
    [router]
  );

  // ✅ Logout
  const logout = useCallback(async () => {
    try {
      await fetcher("/auth/logout", { method: "POST" });
    } catch {
      // ignore
    } finally {
      clearToken();
      setUser(null);
      router.replace("/login");
    }
  }, [router]);

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
