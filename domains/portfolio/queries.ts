"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";
import { portfolioQueryKeys } from "./queryKeys";
import { EMPTY_PORTFOLIO_OPERATING_DATA } from "./types";
import { fetchPortfolioGraph } from "./normalizers";

export function usePortfolioGraphQuery() {
  const { authReady, sessionHydrated, authenticated } = useAuth();

  return useQuery({
    queryKey: portfolioQueryKeys.dashboardGraph,
    queryFn: ({ signal }) => fetchPortfolioGraph(signal),
    enabled: authReady && sessionHydrated && authenticated,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 1,
    placeholderData: (previous) => previous ?? EMPTY_PORTFOLIO_OPERATING_DATA,
  });
}
