"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchTransactions, fetchInsights } from "@/lib/api";
import type { Transaction, InsightsResponse } from "@/lib/api";
import { toErrorMessage } from "@/lib/fetcher";
import { useAuth } from "@/context/AuthContext";
import { adminQueryKeys } from "@/lib/queryKeys/admin";
import { normalizeInsights, normalizeTransaction } from "@/lib/api/normalizers";

export interface ClientDetailData {
  transactions: Transaction[];
  insights: InsightsResponse | null;
  loading: boolean;
  error: string | null;
}

export function useClientDetail(
  clientId: number | null
): ClientDetailData {
  const { authReady, sessionHydrated, authenticated } = useAuth();
  const resolvedClientId = clientId ?? -1;
  const query = useQuery({
    queryKey: adminQueryKeys.clientDetail(resolvedClientId),
    queryFn: async ({ signal }) => {
      const [transactionsResult, insightsResult] = await Promise.allSettled([
        fetchTransactions(String(resolvedClientId), signal),
        fetchInsights(resolvedClientId, signal),
      ]);

      const transactions =
        transactionsResult.status === "fulfilled" && Array.isArray(transactionsResult.value)
          ? transactionsResult.value
              .map((entry, index) => normalizeTransaction(entry, index))
              .filter((entry): entry is Transaction => Boolean(entry))
          : [];
      const insights = insightsResult.status === "fulfilled" ? normalizeInsights(insightsResult.value) : null;

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
    enabled: authReady && sessionHydrated && authenticated && clientId !== null,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 1,
  });

  return {
    transactions: query.data?.transactions ?? [],
    insights: query.data?.insights ?? null,
    loading: query.isPending,
    error: query.error ? toErrorMessage(query.error) : (query.data?.partialError ?? null),
  };
}
