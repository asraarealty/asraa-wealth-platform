import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetcher } from "@/lib/fetcher";
import { useAuth } from "@/context/AuthContext";
import type { Asset, DashboardResponse, InsightsResponse } from "@/lib/types/assets";
import { DASHBOARD_FULL_KEY } from "@/context/DashboardContext";

export const ASSETS_KEY = ["assets", "me"] as const;
export const INSIGHTS_KEY = ["insights", "me"] as const;

interface AssetsData {
  summary: { total_value: number; total_invested: number; total_return: number; return_percentage: number };
  allocation: { stock: number; mf: number; property: number; commodity: number };
  assets: Asset[];
}

interface RawEnvelope<T> {
  success: boolean;
  data: T;
  error: string | null;
}

export function useAssets() {
  const { authReady, authenticated } = useAuth();
  return useQuery<RawEnvelope<AssetsData>, Error, AssetsData>({
    queryKey: ASSETS_KEY,
    queryFn: () => fetcher<RawEnvelope<AssetsData>>("/assets/me", { raw: true }),
    select: (res): AssetsData => {
      // Backend returns { success, data: { summary, allocation, assets } }
      // but may also return the inner data object directly.
      const isEnvelope = res && typeof res === "object" && "data" in res && res.data != null;
      const data: AssetsData = isEnvelope ? (res.data as AssetsData) : (res as unknown as AssetsData);
      return {
        summary: data?.summary ?? { total_value: 0, total_invested: 0, total_return: 0, return_percentage: 0 },
        allocation: data?.allocation ?? { stock: 0, mf: 0, property: 0, commodity: 0 },
        assets: Array.isArray(data?.assets) ? data.assets : [],
      };
    },
    enabled: authReady && authenticated,
  });
}

export function useInsights() {
  const { authReady, authenticated } = useAuth();
  return useQuery<RawEnvelope<InsightsResponse>, Error, InsightsResponse>({
    queryKey: INSIGHTS_KEY,
    queryFn: () => fetcher<RawEnvelope<InsightsResponse>>("/insights/me", { raw: true }),
    select: (res): InsightsResponse => {
      const isEnvelope = res && typeof res === "object" && "data" in res && res.data != null;
      return isEnvelope
        ? (res.data as InsightsResponse)
        : (res as unknown as InsightsResponse) ?? { equity_percentage: 0, real_estate_percentage: 0, alerts: [] };
    },
    enabled: authReady && authenticated,
  });
}

export function useCreateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      fetcher("/assets", { method: "POST", body: payload, raw: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DASHBOARD_FULL_KEY });
    },
  });
}

export function useUpdateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      fetcher(`/assets/${id}`, { method: "PUT", body: payload, raw: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DASHBOARD_FULL_KEY });
    },
  });
}

export function useDeleteAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      fetcher(`/assets/${id}`, { method: "DELETE", raw: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: DASHBOARD_FULL_KEY });
    },
  });
}
