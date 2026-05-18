"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createCanonicalAssetUniverse } from "@/lib/services/assets";
import { resolveLivePrices } from "@/lib/services/market";
import { computePortfolioValuation } from "@/lib/services/portfolio";
import type { EnrichedClient } from "@/lib/hooks/useAdminClients";
import { PortfolioSearchPanel } from "./PortfolioSearchPanel";
import { PortfolioValuationBar } from "./PortfolioValuationBar";
import { AllocationBreakdownPanel } from "./AllocationBreakdownPanel";
import { HoldingsExplorer } from "./HoldingsExplorer";
import type { ClientHoldingRow, PortfolioWorkspaceFilters } from "./types";

interface ClientPortfolioWorkspaceProps {
  clients: EnrichedClient[];
  onOpenClient: (clientId: number) => void;
}

const DEFAULT_FILTERS: PortfolioWorkspaceFilters = {
  query: "",
  searchBy: "all",
  assetClass: "all",
  lifecycle: "all",
};

function lower(value: unknown) {
  return String(value ?? "").toLowerCase();
}

function matchesQuery(row: ClientHoldingRow, query: string, searchBy: PortfolioWorkspaceFilters["searchBy"]) {
  if (!query) return true;

  const q = lower(query);
  if (searchBy === "client") {
    return [row.client.name, row.client.email, row.client.phone].some((value) => lower(value).includes(q));
  }

  if (searchBy === "asset") {
    return [row.asset.name, row.asset.symbol].some((value) => lower(value).includes(q));
  }

  if (searchBy === "stock-symbol") {
    return row.asset.type === "stock" && lower(row.asset.symbol).includes(q);
  }

  if (searchBy === "mutual-fund") {
    return row.asset.type === "mf" && [row.asset.name, row.asset.symbol].some((value) => lower(value).includes(q));
  }

  if (searchBy === "commodity") {
    return row.asset.type === "commodity" && [row.asset.name, row.asset.symbol].some((value) => lower(value).includes(q));
  }

  return [
    row.client.name,
    row.client.email,
    row.asset.name,
    row.asset.symbol,
    row.asset.type,
    row.client.canonicalStatus,
  ].some((value) => lower(value).includes(q));
}

export function ClientPortfolioWorkspace({ clients, onOpenClient }: ClientPortfolioWorkspaceProps) {
  const [filters, setFilters] = useState<PortfolioWorkspaceFilters>(DEFAULT_FILTERS);

  const rows = useMemo<ClientHoldingRow[]>(() => {
    let pricingId = 1;
    return clients.flatMap((client) =>
      createCanonicalAssetUniverse(client.assets).map((canonical) => {
        const asset = client.assets.find((item) => Number(item.id) === canonical.id);
        const row: ClientHoldingRow = {
          key: `${client.id}:${canonical.id}`,
          pricingId,
          client,
          asset: asset ?? client.assets[0],
          canonical: { ...canonical, id: pricingId },
        };
        pricingId += 1;
        return row;
      })
    );
  }, [clients]);

  const filteredRows = useMemo(() => {
    return rows
      .filter((row) => (filters.assetClass === "all" ? true : row.asset.type === filters.assetClass))
      .filter((row) => (filters.lifecycle === "all" ? true : row.client.canonicalStatus === filters.lifecycle))
      .filter((row) => matchesQuery(row, filters.query.trim(), filters.searchBy));
  }, [filters, rows]);

  const holdingsSignature = useMemo(
    () => filteredRows.map((row) => `${row.pricingId}:${row.asset.type}:${row.asset.symbol ?? row.asset.name}`).join("|"),
    [filteredRows]
  );

  const pricingQuery = useQuery({
    queryKey: ["admin", "clients", "portfolio-workspace", "pricing", holdingsSignature],
    queryFn: () => resolveLivePrices(filteredRows.map((row) => row.canonical)),
    enabled: filteredRows.length > 0,
    staleTime: 30_000,
    gcTime: 1000 * 60 * 15,
    placeholderData: (previous) => previous,
  });

  const valuation = useMemo(
    () => computePortfolioValuation(filteredRows.map((row) => row.canonical), pricingQuery.data ?? {}),
    [filteredRows, pricingQuery.data]
  );

  const valuationMap = useMemo(
    () => new Map<number, (typeof valuation.holdings)[number]>(valuation.holdings.map((item) => [item.id, item])),
    [valuation.holdings]
  );

  const explorerRows = useMemo(
    () =>
      filteredRows.map((row) => {
        const v = valuationMap.get(row.pricingId);
        return {
          row,
          livePrice: v?.livePrice ?? 0,
          liveValue: v?.liveValue ?? 0,
          investedValue: v?.investedValue ?? 0,
          unrealizedPnL: v?.unrealizedPnL ?? 0,
        };
      }),
    [filteredRows, valuationMap]
  );

  const allocationSegments = useMemo(
    () => [
      { key: "stock", label: "Stocks", value: valuation.holdings.filter((h) => h.type === "stock").reduce((sum, h) => sum + h.liveValue, 0), pct: valuation.exposurePct.stock, color: "#38bdf8" },
      { key: "mf", label: "Mutual Funds", value: valuation.holdings.filter((h) => h.type === "mf").reduce((sum, h) => sum + h.liveValue, 0), pct: valuation.exposurePct.mf, color: "#818cf8" },
      { key: "commodity", label: "Commodities", value: valuation.holdings.filter((h) => h.type === "commodity").reduce((sum, h) => sum + h.liveValue, 0), pct: valuation.exposurePct.commodity, color: "#f59e0b" },
      { key: "property", label: "Property", value: valuation.holdings.filter((h) => h.type === "property").reduce((sum, h) => sum + h.liveValue, 0), pct: valuation.exposurePct.property, color: "#34d399" },
    ],
    [valuation.exposurePct, valuation.holdings]
  );

  // Realized P&L is not currently exposed by the admin contracts, so we preserve a stable zero fallback.
  const realizedPnL = 0;

  return (
    <div className="space-y-3 rounded-[1.25rem] border border-white/10 bg-[#040915]/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-sky-300/70">Client portfolio workspace</p>
          <h3 className="text-base font-semibold text-white">Unified portfolio discovery & live valuation</h3>
        </div>
        <p className="text-xs text-slate-400">{filteredRows.length} holdings · {clients.length} clients</p>
      </div>

      <PortfolioSearchPanel value={filters} onChange={setFilters} />

      <PortfolioValuationBar
        liveValue={valuation.liveValue}
        investedValue={valuation.investedValue}
        unrealizedPnL={valuation.unrealizedPnL}
        unrealizedPnLPct={valuation.unrealizedPnLPct}
        realizedPnL={realizedPnL}
        isRefreshing={pricingQuery.isFetching}
      />

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[2fr_1fr]">
        <HoldingsExplorer holdings={explorerRows} onOpenClient={onOpenClient} />
        <AllocationBreakdownPanel segments={allocationSegments} />
      </div>
    </div>
  );
}
