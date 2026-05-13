"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, fetcher, toErrorMessage } from "@/lib/fetcher";
import type { EnterpriseReportsData } from "@/lib/types/enterpriseReports";

const DEFAULT_REFRESH_MS = 30_000;

interface State {
  data: EnterpriseReportsData | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  requiresLogin: boolean;
  refresh: () => void;
}

export function useEnterpriseReports(refreshMs = DEFAULT_REFRESH_MS): State {
  const [data, setData] = useState<EnterpriseReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresLogin, setRequiresLogin] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const hasDataRef = useRef(false);

  const refresh = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    hasDataRef.current = data !== null;
  }, [data]);

  useEffect(() => {
    const controller = new AbortController();
    const hasExistingData = hasDataRef.current;

    if (hasExistingData) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);
    setRequiresLogin(false);

    fetcher<EnterpriseReportsData>("/api/reports/enterprise", {
      cache: "no-store",
      noRedirectOn401: true,
      signal: controller.signal,
    })
      .then((payload) => {
        setData(payload);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (err instanceof ApiError && err.status === 401) {
          setRequiresLogin(true);
        }
        setError(toErrorMessage(err));
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });

    return () => controller.abort();
  }, [reloadKey]);

  useEffect(() => {
    let id: number | null = null;
    const startPolling = () => {
      if (id !== null) return;
      id = window.setInterval(() => {
        refresh();
      }, refreshMs);
    };
    const stopPolling = () => {
      if (id === null) return;
      window.clearInterval(id);
      id = null;
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refresh();
        startPolling();
      } else {
        stopPolling();
      }
    };

    if (document.visibilityState === "visible") {
      startPolling();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refresh, refreshMs]);

  return useMemo(
    () => ({
      data,
      loading,
      refreshing,
      error,
      requiresLogin,
      refresh,
    }),
    [data, loading, refreshing, error, requiresLogin, refresh]
  );
}
