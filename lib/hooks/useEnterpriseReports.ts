"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, fetcher, toErrorMessage } from "@/lib/fetcher";
import type { EnterpriseReportsData } from "@/lib/types/enterpriseReports";
import type { RealEstateCategory } from "@/lib/types/realEstate";
import { normalizeRealEstateCategory } from "@/lib/utils/realEstateCategory";
import { subscribeRealEstateDataUpdated } from "@/lib/events/realtime";

const DEFAULT_REFRESH_MS = 30_000;

interface State {
  data: EnterpriseReportsData | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  requiresLogin: boolean;
  refresh: () => void;
}

type UseEnterpriseReportsOptions = {
  refreshMs?: number;
  category?: RealEstateCategory;
};

export function useEnterpriseReports(options: UseEnterpriseReportsOptions = {}): State {
  const { refreshMs = DEFAULT_REFRESH_MS, category = "all" } = options;
  const normalizedCategory = normalizeRealEstateCategory(category);
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

    const query =
      normalizedCategory === "all"
        ? "/api/reports/enterprise"
        : `/api/reports/enterprise?category=${encodeURIComponent(normalizedCategory)}`;

    fetcher<EnterpriseReportsData>(query, {
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
  }, [normalizedCategory, reloadKey]);

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

  useEffect(() => subscribeRealEstateDataUpdated(refresh), [refresh]);

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
