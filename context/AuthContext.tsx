"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  fetcher,
  getToken,
  setToken,
  clearToken,
  ApiError,
  setAuthBootstrapComplete,
} from "@/lib/fetcher";

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
  authInitialized: boolean;
  isHydrating: boolean;
  /** @deprecated use authInitialized */
  initialized: boolean;
  /** @deprecated use isHydrating */
  loading: boolean;
  /** True when the initial /auth/me call failed with a transient (non-401) error. */
  authError: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: (nextPath?: string) => Promise<void>;
  /** Re-runs the /auth/me bootstrap — useful after a transient failure. */
  retryAuth: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [isHydrating, setIsHydrating] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [authAttempt, setAuthAttempt] = useState(0);
  const bootstrapSeqRef = useRef(0);

  const retryAuth = useCallback(() => {
    setAuthAttempt((prev) => prev + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const seq = ++bootstrapSeqRef.current;
    let mounted = true;

    setIsHydrating(true);
    setAuthError(false);
    setAuthInitialized(false);
    setAuthBootstrapComplete(false);
    getToken();

    fetcher<User>("/api/v2/auth/me", {
      signal: controller.signal,
      noRedirectOn401: true,
    })
      .then((me) => {
        if (!mounted || seq !== bootstrapSeqRef.current) return;
        setUser(me);
        setAuthError(false);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (!mounted || seq !== bootstrapSeqRef.current) return;

        if (err instanceof ApiError && err.status === 401) {
          setUser(null);
          setAuthError(false);
          clearToken();
          return;
        }

        console.error("[Auth] /api/v2/auth/me initialization failed with transient error:", err);
        setAuthError(true);
      })
      .finally(() => {
        if (!mounted || seq !== bootstrapSeqRef.current) return;
        setAuthInitialized(true);
        setAuthBootstrapComplete(true);
        setIsHydrating(false);
      });

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [authAttempt]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetcher<{ access_token?: string; accessToken?: string }>("/api/v2/auth/login", {
      method: "POST",
      body: { email, password },
      raw: true,
    });

    const accessToken = res.access_token ?? res.accessToken;
    if (accessToken) {
      setToken(accessToken);
    }

    const me = await fetcher<User>("/api/v2/auth/me");
    setUser(me);
    setAuthError(false);
    setAuthInitialized(true);
    setIsHydrating(false);
    setAuthBootstrapComplete(true);

    return me;
  }, []);

  const logout = useCallback(async (nextPath = "/login") => {
    try {
      await fetcher("/api/v2/auth/logout", { method: "POST" });
    } catch {}
    clearToken();
    setUser(null);
    setAuthError(false);
    // Logout is a terminal auth state for the current session:
    // no bootstrap is running, and auth is known to be unauthenticated.
    setAuthInitialized(true);
    setIsHydrating(false);
    if (typeof window !== "undefined" && window.location.pathname !== nextPath) {
      window.location.assign(nextPath);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        authInitialized,
        isHydrating,
        initialized: authInitialized,
        loading: isHydrating,
        authError,
        login,
        logout,
        retryAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
