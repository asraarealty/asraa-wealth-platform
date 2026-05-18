"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import {
  fetcher,
  setToken,
  getToken,
  setRefreshToken,
  clearRefreshToken,
  clearAuthTokens,
  clearApiClientCaches,
  abortAllRequests,
  resetUnauthorizedBurstCounter,
} from "@/lib/fetcher";
import {
  getAuthLifecycleSnapshot,
  reportAuthTelemetry,
  setAuthFailureHandler,
  setAuthLifecycleState,
  setAuthTelemetryReporter,
  subscribeAuthLifecycle,
  type AuthLifecycleState,
} from "@/lib/authLifecycle";
import { getNow, toDurationMs } from "@/lib/utils/time";

interface User {
  id: number;
  name?: string;
  email: string;
  role?: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  authReady: boolean;
  sessionHydrated: boolean;
  authenticated: boolean;
  isRefreshing: boolean;
  refreshPromise: Promise<string> | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
}

interface LoginResult {
  access_token?: string;
  accessToken?: string;
  refresh_token?: string;
  refreshToken?: string;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const PROTECTED_QUERY_KEYS = [
  "dashboard-full",
  "assets",
  "insights",
  "admin",
  "client-detail",
  "market-intelligence",
  "portfolio",
  "intelligence",
] as const;
// Consider 10 seconds a loop window: repeated redirects in this window indicate unstable session state.
const REDIRECT_LOOP_WINDOW_MS = 10_000;
// Cap at 4 redirects within the window to prevent user lock-in from redirect storms.
const REDIRECT_LOOP_THRESHOLD = 4;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [lifecycle, setLifecycle] = useState<AuthLifecycleState>(() =>
    getAuthLifecycleSnapshot()
  );
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const hydrationRunRef = useRef(0);
  const redirectEventsRef = useRef<number[]>([]);

  const isProtectedQueryKey = useCallback((queryKey: QueryKey): boolean => {
    const top = String(Array.isArray(queryKey) ? queryKey[0] ?? "" : "");
    return PROTECTED_QUERY_KEYS.includes(
      top as (typeof PROTECTED_QUERY_KEYS)[number]
    );
  }, []);

  const safeRedirectToLogin = useCallback(
    (reason: string) => {
      if (typeof window === "undefined") return;
      if (window.location.pathname === "/login") return;

      const now = Date.now();
      const redirectEvents = redirectEventsRef.current;
      redirectEvents.push(now);
      while (
        redirectEvents.length > 0 &&
        now - redirectEvents[0] > REDIRECT_LOOP_WINDOW_MS
      ) {
        redirectEvents.shift();
      }
      if (redirectEvents.length >= REDIRECT_LOOP_THRESHOLD) {
        reportAuthTelemetry({
          type: "redirect-loop",
          reason,
          count: redirectEvents.length,
        });
        return;
      }
      router.replace("/login");
    },
    [router]
  );

  const clearProtectedSessionState = useCallback(async () => {
    clearAuthTokens();
    abortAllRequests();
    clearApiClientCaches();
    await queryClient.cancelQueries({
      predicate: (query) => isProtectedQueryKey(query.queryKey),
    });
    queryClient.invalidateQueries({
      predicate: (query) => isProtectedQueryKey(query.queryKey),
    });
    queryClient.removeQueries({
      predicate: (query) => isProtectedQueryKey(query.queryKey),
    });
  }, [isProtectedQueryKey, queryClient]);

  const resetAuthLifecycle = useCallback((authenticated: boolean) => {
    setAuthLifecycleState({
      authReady: true,
      sessionHydrated: true,
      authenticated,
      isRefreshing: false,
      refreshPromise: null,
    });
  }, []);

  useEffect(() => {
    return subscribeAuthLifecycle(setLifecycle);
  }, []);

  useEffect(() => {
    setAuthTelemetryReporter((event) => {
      if (typeof window === "undefined") return;
      console.info("[auth-telemetry]", event);
    });
    return () => setAuthTelemetryReporter(null);
  }, []);

  useEffect(() => {
    setAuthFailureHandler(async (reason) => {
      setUser(null);
      await clearProtectedSessionState();
      resetUnauthorizedBurstCounter();
      resetAuthLifecycle(false);
      safeRedirectToLogin(reason);
    });
    return () => setAuthFailureHandler(null);
  }, [clearProtectedSessionState, resetAuthLifecycle, safeRedirectToLogin]);

  useEffect(() => {
    const runId = hydrationRunRef.current + 1;
    hydrationRunRef.current = runId;
    const controller = new AbortController();
    const startedAt = getNow();
    const shouldAbortHydration = () =>
      controller.signal.aborted || runId !== hydrationRunRef.current;

    setAuthLifecycleState({
      authReady: false,
      sessionHydrated: false,
      authenticated: false,
    });

    const hydrateSession = async () => {
      const token = getToken();
      if (!token) {
        clearAuthTokens();
        setUser(null);
        resetUnauthorizedBurstCounter();
        resetAuthLifecycle(false);
        return;
      }

      try {
        const me = await fetcher<User>("/auth/me", {
          signal: controller.signal,
          noRedirectOn401: true,
        });
        if (shouldAbortHydration()) return;
        setUser(me);
        resetUnauthorizedBurstCounter();
        resetAuthLifecycle(true);
      } catch (error) {
        if (shouldAbortHydration()) return;
        setUser(null);
        await clearProtectedSessionState();
        resetUnauthorizedBurstCounter();
        resetAuthLifecycle(false);
        if (error instanceof Error) {
          reportAuthTelemetry({ type: "auth-failure", reason: error.message });
        }
      } finally {
        reportAuthTelemetry({
          type: "hydration",
          durationMs: toDurationMs(startedAt),
        });
      }
    };

    void hydrateSession();

    return () => controller.abort();
  }, [clearProtectedSessionState, resetAuthLifecycle]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetcher<LoginResult>("/auth/login", {
        method: "POST",
        body: { email, password },
        raw: true,
        noRedirectOn401: true,
      });

      const token = res.access_token ?? res.accessToken;
      if (!token) {
        throw new Error(
          "Login response missing access token (expected access_token or accessToken)"
        );
      }

      setToken(token);
      const nextRefreshToken = res.refresh_token ?? res.refreshToken;
      if (nextRefreshToken) {
        setRefreshToken(nextRefreshToken);
      } else {
        clearRefreshToken();
      }

      const me = await fetcher<User>("/auth/me", { noRedirectOn401: true });
      setUser(me);
      resetUnauthorizedBurstCounter();
      resetAuthLifecycle(true);
      return me;
    },
    [resetAuthLifecycle]
  );

  const logout = useCallback(async () => {
    try {
      await fetcher("/auth/logout", { method: "POST", noRedirectOn401: true });
    } catch {}

    setUser(null);
    await clearProtectedSessionState();
    resetUnauthorizedBurstCounter();
    resetAuthLifecycle(false);
    if (pathname !== "/login") {
      router.replace("/login");
    }
  }, [
    clearProtectedSessionState,
    pathname,
    resetAuthLifecycle,
    router,
  ]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading: !lifecycle.authReady,
    authReady: lifecycle.authReady,
    sessionHydrated: lifecycle.sessionHydrated,
    authenticated: lifecycle.authenticated,
    isRefreshing: lifecycle.isRefreshing,
    refreshPromise: lifecycle.refreshPromise,
    login,
    logout,
  }), [lifecycle, login, logout, user]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
