"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchPortfolio, type PortfolioFull } from "@/lib/api";
import { toErrorMessage } from "@/lib/fetcher";

type LoadOptions = {
  background?: boolean;
  force?: boolean;
};

type UsePortfolioStateOptions = {
  clientId?: number;
  enabled?: boolean;
  pollMs?: number;
};

type MutationFn<T> = () => Promise<T>;

const DEFAULT_POLL_MS = 20_000;
const CACHE_TTL_MS = 15_000;

type CacheEntry = {
  data: PortfolioFull;
  updatedAt: number;
};

const portfolioCache = new Map<string, CacheEntry>();

function getKey(clientId?: number): string {
  return clientId !== undefined ? `client:${clientId}` : "me";
}

function readFreshCache(key: string): PortfolioFull | null {
  const cached = portfolioCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.updatedAt > CACHE_TTL_MS) return null;
  return cached.data;
}

function writeCache(key: string, data: PortfolioFull) {
  portfolioCache.set(key, { data, updatedAt: Date.now() });
}

export function invalidatePortfolioCache(clientId?: number) {
  if (clientId === undefined) {
    portfolioCache.delete("me");
    return;
  }
  portfolioCache.delete(getKey(clientId));
}

export function usePortfolioState(options: UsePortfolioStateOptions = {}) {
  const { clientId, enabled = true, pollMs = DEFAULT_POLL_MS } = options;
  const key = useMemo(() => getKey(clientId), [clientId]);

  const [portfolio, setPortfolio] = useState<PortfolioFull | null>(() => readFreshCache(key));
  const [loading, setLoading] = useState(enabled && !readFreshCache(key));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const reqSeqRef = useRef(0);
  const inFlightRef = useRef<Promise<void> | null>(null);

  const load = useCallback((loadOptions: LoadOptions = {}) => {
    const { background = false, force = false } = loadOptions;
    if (!enabled) return Promise.resolve();

    if (inFlightRef.current && !force) {
      return inFlightRef.current;
    }

    const cached = readFreshCache(key);
    if (!force && cached) {
      setPortfolio(cached);
      setLoading(false);
      setRefreshing(false);
      setError(null);
      return Promise.resolve();
    }

    if (force) {
      abortRef.current?.abort();
    }

    const ac = new AbortController();
    abortRef.current = ac;
    const reqSeq = ++reqSeqRef.current;

    if (background) {
      setRefreshing(true);
    } else {
      setLoading(true);
      setPortfolio(cached ?? null);
    }
    setError(null);

    const request = fetchPortfolio(clientId, ac.signal)
      .then((data) => {
        if (reqSeq !== reqSeqRef.current) return;
        writeCache(key, data);
        setPortfolio(data);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (reqSeq !== reqSeqRef.current) return;
        setError(toErrorMessage(err));
      })
      .finally(() => {
        if (reqSeq === reqSeqRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
        if (inFlightRef.current === request) {
          inFlightRef.current = null;
        }
      });

    inFlightRef.current = request;
    return request;
  }, [clientId, enabled, key]);

  const refresh = useCallback(() => load({ background: true, force: true }), [load]);

  const runMutation = useCallback(async <T,>(fn: MutationFn<T>): Promise<T> => {
    const result = await fn();
    invalidatePortfolioCache(clientId);
    await load({ background: true, force: true });
    return result;
  }, [clientId, load]);

  useEffect(() => {
    const cached = readFreshCache(key);
    setPortfolio(cached);
    setLoading(enabled && !cached);
    setRefreshing(false);
    setError(null);

    if (!enabled) {
      abortRef.current?.abort();
      return;
    }

    void load({ force: true }).catch((err) => {
      console.error(`[usePortfolioState] Initial load failed for ${key}:`, err);
    });

    return () => {
      abortRef.current?.abort();
    };
  }, [enabled, key, load]);

  useEffect(() => {
    if (!enabled) return;

    function doRefresh() {
      if (document.visibilityState === "hidden") return;
      void load({ background: true }).catch((err) => {
        console.warn(`[usePortfolioState] Background refresh failed for ${key}:`, err);
      });
    }

    const interval = window.setInterval(doRefresh, pollMs);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        doRefresh();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled, load, pollMs]);

  return {
    portfolio,
    assets: portfolio?.positions ?? [],
    loading,
    refreshing,
    error,
    refresh,
    retry: refresh,
    runMutation,
  };
}
