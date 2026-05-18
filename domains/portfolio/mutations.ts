"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createAsset, deleteAsset, updateAsset } from "@/lib/api";
import type { Asset } from "@/lib/types/assets";
import { portfolioQueryKeys } from "./queryKeys";
import type { PortfolioOperatingData } from "./types";

export function useCreatePortfolioAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => createAsset(payload as never),
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: portfolioQueryKeys.dashboardGraph });
      const previous = qc.getQueryData<PortfolioOperatingData>(portfolioQueryKeys.dashboardGraph);
      if (previous) {
        const optimisticAsset = { id: Date.now(), ...(payload as Record<string, unknown>) } as unknown as Asset;
        qc.setQueryData<PortfolioOperatingData>(portfolioQueryKeys.dashboardGraph, {
          ...previous,
          assets: [...previous.assets, optimisticAsset],
        });
      }
      return { previous };
    },
    onError: (_error, _payload, context) => {
      if (context?.previous) {
        qc.setQueryData(portfolioQueryKeys.dashboardGraph, context.previous);
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: portfolioQueryKeys.dashboardGraph }),
  });
}

export function useUpdatePortfolioAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      updateAsset(id, payload as never),
    onMutate: async ({ id, payload }) => {
      await qc.cancelQueries({ queryKey: portfolioQueryKeys.dashboardGraph });
      const previous = qc.getQueryData<PortfolioOperatingData>(portfolioQueryKeys.dashboardGraph);
      if (previous) {
        qc.setQueryData<PortfolioOperatingData>(portfolioQueryKeys.dashboardGraph, {
          ...previous,
          assets: previous.assets.map((asset) => (asset.id === id ? { ...asset, ...payload } : asset)),
        });
      }
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) qc.setQueryData(portfolioQueryKeys.dashboardGraph, context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: portfolioQueryKeys.dashboardGraph }),
  });
}

export function useDeletePortfolioAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteAsset(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: portfolioQueryKeys.dashboardGraph });
      const previous = qc.getQueryData<PortfolioOperatingData>(portfolioQueryKeys.dashboardGraph);
      if (previous) {
        qc.setQueryData<PortfolioOperatingData>(portfolioQueryKeys.dashboardGraph, {
          ...previous,
          assets: previous.assets.filter((asset) => asset.id !== id),
        });
      }
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) qc.setQueryData(portfolioQueryKeys.dashboardGraph, context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: portfolioQueryKeys.dashboardGraph }),
  });
}
