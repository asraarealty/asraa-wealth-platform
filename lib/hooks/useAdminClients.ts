"use client";

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAdminGroupedAssets, type Asset } from "@/lib/api";
import { toErrorMessage } from "@/lib/fetcher";
import { fetchAdminClients } from "@/lib/services/clientService";
import { adminQueryKeys } from "@/lib/queryKeys/admin";
import {
  EMPTY_KPIS,
  enrichClients,
  type AdminClientsKPIs,
  type EnrichedClient,
} from "@/lib/utils/adminClientIntelligence";
import { useAuth } from "@/context/AuthContext";

export const ADMIN_CLIENTS_QUERY_KEY = adminQueryKeys.clientsWorkspace;

export interface UseAdminClientsResult {
  clients: EnrichedClient[];
  kpis: AdminClientsKPIs;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useAdminClients(): UseAdminClientsResult {
  const { authReady, sessionHydrated, authenticated } = useAuth();
  const query = useQuery({
    queryKey: ADMIN_CLIENTS_QUERY_KEY,
    queryFn: async ({ signal }) => {
      const startedAt =
        typeof performance !== "undefined" && typeof performance.now === "function"
          ? performance.now()
          : Date.now();
      const clients = await fetchAdminClients(signal);
      let groupedAssets: Record<number, Asset[]> = {};

      try {
        groupedAssets = await fetchAdminGroupedAssets(signal);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          throw error;
        }
        console.warn("[useAdminClients] grouped asset enrichment unavailable", error);
      }

      const enriched = enrichClients(clients, groupedAssets);
      const duration =
        typeof performance !== "undefined" && typeof performance.now === "function"
          ? performance.now() - startedAt
          : Date.now() - startedAt;
      console.info("[admin-workspace]", {
        event: "hydration.complete",
        clients: enriched.clients.length,
        durationMs: Number(duration.toFixed(2)),
      });
      return enriched;
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 1,
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

export type { EnrichedClient, AdminClientsKPIs } from "@/lib/utils/adminClientIntelligence";
