"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
  const transactionsQuery = useQuery({
    queryKey: ["client-detail", clientId, "transactions"],
    queryFn: ({ signal }) => fetchTransactions(String(clientId), signal),
    enabled: clientId !== null,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const insightsQuery = useQuery({
    queryKey: ["client-detail", clientId, "insights"],
    queryFn: ({ signal }) => fetchInsights(clientId ?? undefined, signal),
    enabled: clientId !== null,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const error = useMemo(() => {
    if (transactionsQuery.error) return toErrorMessage(transactionsQuery.error);
    if (insightsQuery.error) return toErrorMessage(insightsQuery.error);
    return null;
  }, [insightsQuery.error, transactionsQuery.error]);

  return {
    transactions: Array.isArray(transactionsQuery.data) ? transactionsQuery.data : [],
    insights: insightsQuery.data ?? null,
    loading: transactionsQuery.isLoading || insightsQuery.isLoading,
    error,
  };
}
