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
import { login as apiLogin, logout as apiLogout, getMe, type MeResponse } from "@/lib/api";
import { storeToken, clearToken, getStoredToken } from "@/lib/fetcher";

interface AuthContextValue {
  user: MeResponse | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<MeResponse | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on mount.
  useEffect(() => {
    let cancelled = false;
    const stored = getStoredToken();
    if (!stored) {
      setLoading(false);
      return;
    }
    setToken(stored);
    getMe()
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        if (!cancelled) {
          clearToken();
          setToken(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const { access_token } = await apiLogin({ email, password });
      storeToken(access_token);
      setToken(access_token);
      const me = await getMe();
      setUser(me);
      router.replace(me.role === "admin" ? "/admin" : "/dashboard");
    },
    [router]
  );

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // Always clear the local session even if the server call fails.
    } finally {
      clearToken();
      setToken(null);
      setUser(null);
      router.replace("/login");
    }
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
