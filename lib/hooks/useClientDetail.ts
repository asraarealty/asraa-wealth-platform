"use client";

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
  const query = useQuery({
    queryKey: ["client-detail", clientId],
    queryFn: async ({ signal }) => {
      const [transactionsResult, insightsResult] = await Promise.allSettled([
        fetchTransactions(String(clientId), signal),
        fetchInsights(clientId ?? undefined, signal),
      ]);

      const transactions =
        transactionsResult.status === "fulfilled" && Array.isArray(transactionsResult.value)
          ? transactionsResult.value
          : [];
      const insights = insightsResult.status === "fulfilled" ? insightsResult.value ?? null : null;

      const transactionError =
        transactionsResult.status === "rejected"
          ? toErrorMessage(transactionsResult.reason)
          : null;
      const insightsError =
        insightsResult.status === "rejected" ? toErrorMessage(insightsResult.reason) : null;

      return {
        transactions,
        insights,
        partialError: transactionError ?? insightsError,
      };
    },
    enabled: clientId !== null,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  return {
    transactions: query.data?.transactions ?? [],
    insights: query.data?.insights ?? null,
    loading: query.isPending,
    error: query.error ? toErrorMessage(query.error) : (query.data?.partialError ?? null),
  };
}
