"use client";

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAdminGroupedAssets, fetchTransactions, type Asset, type Transaction } from "@/lib/api";
import { toErrorMessage } from "@/lib/fetcher";
import { fetchAdminClients, fetchClientById, type ClientProfile } from "@/lib/services/clientService";
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
  fetching: boolean;
  degraded: boolean;
  error: string | null;
  refresh: () => void;
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

      const enriched = enrichClients(clients, groupedAssets);
      if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
        const groupedCount = Object.values(groupedAssets).reduce((sum, assets) => sum + assets.length, 0);
        console.info("[domain-query]", {
          stage: "clients-workspace",
          rawPayloadSize: clients.length + groupedCount,
          normalizedEntityCount: enriched.clients.length,
          rejectedEntities: 0,
        });
      }
      return enriched;
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
  const queryClient = useQueryClient();
  const resolvedClientId = clientId ?? -1;
  const detailKey = adminDomainQueryKeys.clientDetail(resolvedClientId);

  const query = useQuery({
    queryKey: detailKey,
    queryFn: async ({ signal }) => {
      const previous = queryClient.getQueryData<{
        transactions: Transaction[];
        insights: ClientIntelligenceData["insights"];
        partialError: string | null;
      }>(detailKey);
      const [transactionsResult, insightsResult] = await Promise.allSettled([
        fetchTransactions(String(resolvedClientId), signal),
        fetchClientIntelligence(resolvedClientId, signal),
      ]);

      const normalizedTransactions =
        transactionsResult.status === "fulfilled" && Array.isArray(transactionsResult.value)
          ? transactionsResult.value
              .map((entry, index) => normalizeTransaction(entry, index))
              .filter((entry): entry is Transaction => Boolean(entry))
          : null;

      const normalizedInsights =
        insightsResult.status === "fulfilled"
          ? insightsResult.value.insights
          : null;
      const transactionError =
        transactionsResult.status === "rejected" ? toErrorMessage(transactionsResult.reason) : null;
      const insightsError =
        insightsResult.status === "rejected"
          ? toErrorMessage(insightsResult.reason)
          : (insightsResult.value.degradedState ?? null);
      const partialError = transactionError ?? insightsError;
      const transactions = normalizedTransactions ?? previous?.transactions ?? [];
      const insights = normalizedInsights ?? previous?.insights ?? null;

      if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
        const degraded = Boolean(partialError);
        console.info("[domain-query]", {
          stage: "client-detail",
          clientId: resolvedClientId,
          transactionCount: transactions.length,
          insightAlertsCount: Array.isArray(insights?.alerts) ? insights.alerts.length : 0,
          degraded,
          cacheReconcile: {
            previousTransactions: previous?.transactions?.length ?? 0,
            incomingTransactions: normalizedTransactions?.length ?? 0,
            finalTransactions: transactions.length,
            previousAlerts: Array.isArray(previous?.insights?.alerts) ? previous?.insights?.alerts.length : 0,
            incomingAlerts: Array.isArray(normalizedInsights?.alerts) ? normalizedInsights?.alerts.length : 0,
            finalAlerts: Array.isArray(insights?.alerts) ? insights.alerts.length : 0,
            fallbackActivationReason: partialError,
          },
        });
        // [detail-query] telemetry: surface hydration outcome clearly
        if (!degraded && normalizedInsights !== null) {
          console.info("[detail-query]", {
            event: "hydration.success",
            clientId: resolvedClientId,
            transactionCount: transactions.length,
            insightAlertsCount: Array.isArray(insights?.alerts) ? insights.alerts.length : 0,
          });
        } else if (degraded) {
          console.info("[detail-query]", {
            event: "hydration.degraded",
            clientId: resolvedClientId,
            reason: partialError,
            hasCachedInsights: normalizedInsights === null && Boolean(previous?.insights),
            hasCachedTransactions: normalizedTransactions === null && Boolean(previous?.transactions?.length),
          });
        }
      }

      return {
        transactions,
        insights,
        partialError,
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

  const refresh = useCallback(() => {
    void query.refetch();
  }, [query]);

  return {
    transactions: query.data?.transactions ?? [],
    insights: query.data?.insights ?? null,
    loading: query.isPending && !query.data,
    fetching: query.isFetching,
    degraded: Boolean(query.error || query.data?.partialError),
    error: query.error ? toErrorMessage(query.error) : (query.data?.partialError ?? null),
    refresh,
  };
}

export interface UseAdminClientProfileResult {
  profile: ClientProfile | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useAdminClientProfile(clientId: number | null): UseAdminClientProfileResult {
  const { authReady, sessionHydrated, authenticated } = useAuth();
  const resolvedClientId = clientId ?? -1;
  const query = useQuery({
    queryKey: adminDomainQueryKeys.clientProfile(resolvedClientId),
    queryFn: ({ signal }) => fetchClientById(resolvedClientId, signal),
    enabled: authReady && sessionHydrated && authenticated && clientId !== null,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 1,
    placeholderData: (previous) => previous,
  });

  const refresh = useCallback(() => {
    void query.refetch();
  }, [query]);

  return {
    profile: query.data ?? null,
    loading: query.isPending && !query.data,
    error: query.error ? toErrorMessage(query.error) : null,
    refresh,
  };
}
