import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetcher } from "@/lib/fetcher";
import { useAuth } from "@/context/AuthContext";
import type { DashboardResponse, InsightsResponse } from "@/lib/types/assets";
import {
  portfolioQueryKeys,
  useCreatePortfolioAsset,
  useDeletePortfolioAsset,
  usePortfolioGraphQuery,
  useUpdatePortfolioAsset,
} from "@/domains/portfolio";

export const ASSETS_KEY = portfolioQueryKeys.assetsMe;
export const INSIGHTS_KEY = ["intelligence", "legacy", "me"] as const;

export function useAssets() {
  const query = usePortfolioGraphQuery();

  return {
    ...query,
    data: {
      summary: query.data?.summary ?? { total_value: 0, total_invested: 0, total_return: 0, return_percentage: 0 },
      allocation: query.data?.allocation ?? { stock: 0, mf: 0, property: 0, commodity: 0 },
      assets: query.data?.assets ?? [],
      degradedState: query.data?.degradedState ?? null,
    },
  };
}

interface RawEnvelope<T> {
  success: boolean;
  data: T;
  error: string | null;
}

export function useInsights() {
  const { authReady, sessionHydrated, authenticated } = useAuth();
  const portfolio = usePortfolioGraphQuery();

  const fallback = useMemo<InsightsResponse>(() => {
    if ((portfolio.data?.insights?.length ?? 0) > 0) {
      return {
        equity_percentage: Number(portfolio.data?.allocation.stock ?? 0),
        real_estate_percentage: Number(portfolio.data?.allocation.property ?? 0),
        alerts: portfolio.data?.insights ?? [],
      };
    }
    return { equity_percentage: 0, real_estate_percentage: 0, alerts: [] };
  }, [portfolio.data?.allocation.property, portfolio.data?.allocation.stock, portfolio.data?.insights]);

  return useQuery<RawEnvelope<InsightsResponse>, Error, InsightsResponse>({
    queryKey: INSIGHTS_KEY,
    queryFn: () => fetcher<RawEnvelope<InsightsResponse>>("/insights/me", { raw: true }),
    select: (res): InsightsResponse => {
      const isEnvelope = res && typeof res === "object" && "data" in res && res.data != null;
      return isEnvelope ? (res.data as InsightsResponse) : ((res as unknown as InsightsResponse) ?? fallback);
    },
    placeholderData: (previous) => previous ?? fallback,
    enabled: authReady && sessionHydrated && authenticated,
  });
}

export const useCreateAsset = useCreatePortfolioAsset;
export const useUpdateAsset = useUpdatePortfolioAsset;
export const useDeleteAsset = useDeletePortfolioAsset;

export type { DashboardResponse };
