"use client";

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAdminGroupedAssets, fetchTransactions, type Asset, type Transaction } from "@/lib/api";
import { toErrorMessage } from "@/lib/fetcher";
import { fetchAdminClients } from "@/lib/services/clientService";
import { EMPTY_KPIS, enrichClients, type AdminClientsKPIs, type EnrichedClient } from "@/lib/utils/adminClientIntelligence";
import { useAuth } from "@/context/AuthContext";
import { adminDomainQueryKeys } from "./queryKeys";
import { fetchClientIntelligence, type ClientIntelligenceData } from "@/domains/intelligence";
import { normalizeTransaction } from "@/lib/api/normalizers";

export interface UseAdminClientsResult {
  clients: EnrichedClient[];
  kpis: AdminClientsKPIs;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export interface ClientDetailData {
  transactions: Transaction[];
  insights: ClientIntelligenceData["insights"];
  loading: boolean;
  error: string | null;
}

export function useAdminClientsWorkspace(): UseAdminClientsResult {
  const { authReady, sessionHydrated, authenticated } = useAuth();

  const query = useQuery({
    queryKey: adminDomainQueryKeys.clientsWorkspace,
    queryFn: async ({ signal }) => {
      const clients = await fetchAdminClients(signal);
      let groupedAssets: Record<number, Asset[]> = {};

      try {
        groupedAssets = await fetchAdminGroupedAssets(signal);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") throw error;
        console.warn("[admin-domain] grouped assets unavailable", error);
      }

      return enrichClients(clients, groupedAssets);
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 1,
    placeholderData: (previous) => previous,
    enabled: authReady && sessionHydrated && authenticated,
  });

  const refresh = useCallback(() => {
    void query.refetch();
  }, [query]);

  return {
    clients: query.data?.clients ?? [],
    kpis: query.data?.kpis ?? EMPTY_KPIS,
    loading: query.isPending && !query.data,
    error: query.error ? toErrorMessage(query.error) : null,
    refresh,
  };
}

export function useAdminClientDetail(clientId: number | null): ClientDetailData {
  const { authReady, sessionHydrated, authenticated } = useAuth();
  const resolvedClientId = clientId ?? -1;

  const query = useQuery({
    queryKey: adminDomainQueryKeys.clientDetail(resolvedClientId),
    queryFn: async ({ signal }) => {
      const [transactionsResult, insightsResult] = await Promise.allSettled([
        fetchTransactions(String(resolvedClientId), signal),
        fetchClientIntelligence(resolvedClientId, signal),
      ]);

      const transactions =
        transactionsResult.status === "fulfilled" && Array.isArray(transactionsResult.value)
          ? transactionsResult.value
              .map((entry, index) => normalizeTransaction(entry, index))
              .filter((entry): entry is Transaction => Boolean(entry))
          : [];

      const insights =
        insightsResult.status === "fulfilled"
          ? insightsResult.value.insights
          : null;
      const transactionError =
        transactionsResult.status === "rejected" ? toErrorMessage(transactionsResult.reason) : null;
      const insightsError = insightsResult.status === "rejected" ? toErrorMessage(insightsResult.reason) : null;

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
    placeholderData: (previous) => previous,
  });

  return {
    transactions: query.data?.transactions ?? [],
    insights: query.data?.insights ?? null,
    loading: query.isPending,
    error: query.error ? toErrorMessage(query.error) : (query.data?.partialError ?? null),
  };
}
