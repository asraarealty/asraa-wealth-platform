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
import { fetcher, setToken, clearToken, getToken } from "@/lib/fetcher";

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

  // ✅ Restore session ONLY if token exists
  useEffect(() => {
    let cancelled = false;

    const token = getToken();

    if (!token) {
      setLoading(false);
      return;
    }

    fetcher<User>("/auth/me")
      .then((data) => {
        if (!cancelled) setUser(data);
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
          clearToken(); // 🔥 cleanup invalid token
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // ✅ Login
  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetcher<{ access_token: string }>("/auth/login", {
        method: "POST",
        body: { email, password },
        raw: true,
      });

      // 🔐 Save token
      setToken(res.access_token);

      // 👤 Fetch user
      const me = await fetcher<User>("/auth/me");
      setUser(me);

      // 🔥 FIX: safer role handling + guaranteed navigation
      const isAdmin = String(me?.role).toLowerCase() === "admin";

      // small delay ensures React state settles before navigation
      setTimeout(() => {
        router.replace(isAdmin ? "/admin" : "/dashboard");
      }, 0);
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

      // ensure redirect always happens
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
