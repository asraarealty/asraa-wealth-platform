"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchAdminGroupedAssets } from "@/lib/api";
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
    queryFn: async () => {
      const [clients, groupedAssets] = await Promise.all([
        fetchAdminClients(),
        fetchAdminGroupedAssets(),
      ]);
      return enrichClients(clients, groupedAssets);
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  return {
    clients: query.data?.clients ?? [],
    kpis: query.data?.kpis ?? EMPTY_KPIS,
    loading: query.isLoading,
    error: query.error ? toErrorMessage(query.error) : null,
    refresh: () => {
      void query.refetch();
    },
  };
}

export type { EnrichedClient, AdminClientsKPIs } from "@/lib/utils/adminClientIntelligence";
