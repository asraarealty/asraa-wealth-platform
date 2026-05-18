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
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

interface LoginResult {
  access_token?: string;
  accessToken?: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = getToken();

    if (!token) {
      setLoading(false);
      return;
    }

    fetcher<User>("/auth/me")
      .then(setUser)
      .catch(() => {
        setUser(null);
        clearToken();
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetcher<LoginResult>("/auth/login", {
      method: "POST",
      body: { email, password },
      raw: true,
    });

    const token = res.access_token ?? res.accessToken;
    if (!token) {
      throw new Error(
        "Login response missing access token (expected access_token or accessToken)"
      );
    }

    setToken(token);

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
    router.replace("/login");
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
