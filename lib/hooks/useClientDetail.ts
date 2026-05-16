"use client";

import { useState, useEffect } from "react";
import { fetchTransactions, fetchInsights } from "@/lib/api";
import type { Transaction, InsightsResponse } from "@/lib/api";
import { toErrorMessage } from "@/lib/fetcher";

export interface ClientDetailData {
  transactions: Transaction[];
  insights: InsightsResponse | null;
  loading: boolean;
  error: string | null;
}

export function useClientDetail(
  clientId: number | null
): ClientDetailData {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (clientId === null) {
      setTransactions([]);
      setInsights(null);
      setLoading(false);
      setError(null);
      return;
    }

    const ac = new AbortController();
    setLoading(true);
    setError(null);

    Promise.all([
      fetchTransactions(String(clientId), ac.signal).catch((): Transaction[] => []),
      fetchInsights(clientId, ac.signal).catch((): InsightsResponse => ({
        equityPercentage: 0,
        propertyPercentage: 0,
        alerts: [],
      })),
    ])
      .then(([txns, ins]) => {
        setTransactions(Array.isArray(txns) ? txns : []);
        setInsights(ins);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(toErrorMessage(err));
      })
      .finally(() => setLoading(false));

    return () => ac.abort();
  }, [clientId]);

  return { transactions, insights, loading, error };
}
