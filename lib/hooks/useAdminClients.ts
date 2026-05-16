"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchAdminClients, fetchAdminGroupedAssets } from "@/lib/api";
import type { AdminClient, Asset } from "@/lib/api";
import { toErrorMessage } from "@/lib/fetcher";

// Enriched client type with computed portfolio metrics derived from backend data
export interface EnrichedClient extends AdminClient {
  totalNetWorth: number;
  stockValue: number;
  mfValue: number;
  propertyValue: number;
  commodityValue: number;
  equityExposurePct: number;
  commodityExposurePct: number;
  propertiesCount: number;
  monthlyRentIncome: number;
  allocationMix: { stock: number; mf: number; property: number; commodity: number };
  lastActivity: string | undefined;
  assets: Asset[];
}

export interface AdminClientsKPIs {
  totalClients: number;
  activeClients: number;
  inactiveClients: number;
  totalAUM: number;
  totalProperties: number;
  avgPortfolioValue: number;
}

export interface UseAdminClientsResult {
  clients: EnrichedClient[];
  kpis: AdminClientsKPIs;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const EMPTY_KPIS: AdminClientsKPIs = {
  totalClients: 0,
  activeClients: 0,
  inactiveClients: 0,
  totalAUM: 0,
  totalProperties: 0,
  avgPortfolioValue: 0,
};

export function useAdminClients(): UseAdminClientsResult {
  const [clients, setClients] = useState<EnrichedClient[]>([]);
  const [kpis, setKpis] = useState<AdminClientsKPIs>(EMPTY_KPIS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const ac = new AbortController();

    setLoading(true);
    setError(null);

    Promise.all([
      fetchAdminClients(ac.signal),
      fetchAdminGroupedAssets(ac.signal),
    ])
      .then(([rawClients, groupedAssets]) => {
        const enriched: EnrichedClient[] = rawClients.map((client) => {
          const assets = groupedAssets[client.id] ?? [];

          const stockValue = assets
            .filter((a) => a.type === "stock")
            .reduce((s, a) => s + (a.value || 0), 0);
          const mfValue = assets
            .filter((a) => a.type === "mf")
            .reduce((s, a) => s + (a.value || 0), 0);
          const propertyValue = assets
            .filter((a) => a.type === "property")
            .reduce((s, a) => s + (a.value || 0), 0);
          const commodityValue = assets
            .filter((a) => a.type === "commodity")
            .reduce((s, a) => s + (a.value || 0), 0);
          const totalNetWorth = stockValue + mfValue + propertyValue + commodityValue;

          const equityExposurePct =
            totalNetWorth > 0
              ? ((stockValue + mfValue) / totalNetWorth) * 100
              : 0;
          const commodityExposurePct =
            totalNetWorth > 0 ? (commodityValue / totalNetWorth) * 100 : 0;

          const propertiesCount = assets.filter(
            (a) => a.type === "property"
          ).length;

          const monthlyRentIncome = assets
            .filter((a) => a.type === "property")
            .reduce((s, a) => s + (a.rentAmount ?? 0), 0);

          const allocationMix =
            totalNetWorth > 0
              ? {
                  stock: (stockValue / totalNetWorth) * 100,
                  mf: (mfValue / totalNetWorth) * 100,
                  property: (propertyValue / totalNetWorth) * 100,
                  commodity: (commodityValue / totalNetWorth) * 100,
                }
              : { stock: 0, mf: 0, property: 0, commodity: 0 };

          // Derive last activity from asset timestamps or client creation date
          const assetDates = assets
            .map((a) => a.createdAt || a.created_at)
            .filter(Boolean) as string[];
          const allDates = [
            client.createdAt,
            client.created_at,
            ...assetDates,
          ].filter(Boolean) as string[];
          const lastActivity =
            allDates.length > 0
              ? allDates.sort(
                  (a, b) =>
                    new Date(b).getTime() - new Date(a).getTime()
                )[0]
              : undefined;

          return {
            ...client,
            totalNetWorth,
            stockValue,
            mfValue,
            propertyValue,
            commodityValue,
            equityExposurePct,
            commodityExposurePct,
            propertiesCount,
            monthlyRentIncome,
            allocationMix,
            lastActivity,
            assets,
          };
        });

        const totalAUM = enriched.reduce((s, c) => s + c.totalNetWorth, 0);
        const totalProperties = enriched.reduce(
          (s, c) => s + c.propertiesCount,
          0
        );

        setClients(enriched);
        setKpis({
          totalClients: enriched.length,
          activeClients: enriched.filter((c) => c.isActive).length,
          inactiveClients: enriched.filter((c) => !c.isActive).length,
          totalAUM,
          totalProperties,
          avgPortfolioValue:
            enriched.length > 0 ? totalAUM / enriched.length : 0,
        });
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(toErrorMessage(err));
      })
      .finally(() => setLoading(false));

    return () => ac.abort();
  }, [tick]);

  return { clients, kpis, loading, error, refresh };
}
