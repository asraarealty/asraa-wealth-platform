"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import {
  EMPTY_PORTFOLIO_OPERATING_DATA,
  portfolioQueryKeys,
  usePortfolioGraphQuery,
  type EventItem,
  type PortfolioOperatingData,
} from "@/domains/portfolio";

interface DashboardContextValue {
  data: PortfolioOperatingData;
  isLoading: boolean;
  isError: boolean;
  marketSyncNotice: string | null;
  refetchAll: () => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export const DASHBOARD_FULL_KEY = portfolioQueryKeys.dashboardGraph;

export function DashboardProvider({ children }: { children: ReactNode }) {
  const query = usePortfolioGraphQuery();

  const refetchAll = useCallback(() => {
    void query.refetch();
  }, [query]);

  const value: DashboardContextValue = useMemo(
    () => ({
      data: query.data ?? EMPTY_PORTFOLIO_OPERATING_DATA,
      isLoading: query.isLoading,
      isError: query.isError,
      marketSyncNotice: query.data?.degradedState ?? null,
      refetchAll,
    }),
    [query.data, query.isError, query.isLoading, refetchAll]
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboardData(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboardData must be used within DashboardProvider");
  return ctx;
}

export type { EventItem, PortfolioOperatingData as DashboardOperatingData };
