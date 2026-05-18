"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { intelligenceQueryKeys } from "./queryKeys";
import { EMPTY_INTELLIGENCE, fetchClientIntelligence, fetchIntelligencePipeline } from "./normalizers";

export function useIntelligencePipelineQuery() {
  const { authReady, sessionHydrated, authenticated } = useAuth();
  return useQuery({
    queryKey: intelligenceQueryKeys.pipeline,
    queryFn: ({ signal }) => fetchIntelligencePipeline(signal),
    enabled: authReady && sessionHydrated && authenticated,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 1,
    placeholderData: (previous) => previous ?? EMPTY_INTELLIGENCE,
  });
}

export function useClientIntelligenceQuery(clientId: number | null) {
  const { authReady, sessionHydrated, authenticated } = useAuth();
  return useQuery({
    queryKey: intelligenceQueryKeys.clientPipeline(clientId ?? -1),
    queryFn: ({ signal }) => fetchClientIntelligence(clientId ?? -1, signal),
    enabled: authReady && sessionHydrated && authenticated && clientId !== null,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 1,
    placeholderData: (previous) => previous ?? { insights: null, degradedState: null },
  });
}
