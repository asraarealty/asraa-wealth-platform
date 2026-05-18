"use client";

import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAdminGroupedAssets, type Asset } from "@/lib/api";
import { toErrorMessage } from "@/lib/fetcher";
import { fetchAdminClients } from "@/lib/services/clientService";
import {
  EMPTY_KPIS,
  enrichClients,
  type AdminClientsKPIs,
  type EnrichedClient,
} from "@/lib/utils/adminClientIntelligence";

export const ADMIN_CLIENTS_QUERY_KEY = ["admin", "clients", "workspace"] as const;

export interface UseAdminClientsResult {
  clients: EnrichedClient[];
  kpis: AdminClientsKPIs;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useAdminClients(): UseAdminClientsResult {
  const query = useQuery({
    queryKey: ADMIN_CLIENTS_QUERY_KEY,
    queryFn: async ({ signal }) => {
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

      return enrichClients(clients, groupedAssets);
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 1,
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
