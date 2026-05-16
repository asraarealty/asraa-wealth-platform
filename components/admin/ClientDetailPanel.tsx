"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AssetCard } from "@/components/admin/platform/AssetCard";
import { AllocationRing } from "@/components/admin/platform/AllocationRing";
import { OperationalEmptyState } from "@/components/admin/platform/EmptyState";
import { IntelligenceWidget } from "@/components/admin/platform/IntelligenceWidget";
import { PlatformConfirmModal } from "@/components/admin/platform/PlatformModal";
import { StatusBadge } from "@/components/admin/platform/StatusBadge";
import { type Asset, deleteAsset } from "@/lib/api";
import { fmtCurrency, fmtPercent } from "@/lib/formatters";
import { ADMIN_CLIENTS_QUERY_KEY, type EnrichedClient } from "@/lib/hooks/useAdminClients";
import { useClientDetail } from "@/lib/hooks/useClientDetail";
import { createCanonicalAssetUniverse } from "@/lib/services/assets";
import { resolveLivePrices } from "@/lib/services/market";
import { computePortfolioValuation } from "@/lib/services/portfolio";
import { toErrorMessage } from "@/lib/fetcher";

function fmtDate(iso?: string): string {
  if (!iso) return "Awaiting signal";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function dueState(value?: string) {
  if (!value) return { label: "No rent milestone", tone: "neutral" as const };
  const diff = Math.ceil((new Date(value).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: `Overdue ${Math.abs(diff)}d`, tone: "danger" as const };
  if (diff <= 5) return { label: `Due in ${diff}d`, tone: "warn" as const };
  return { label: "On track", tone: "success" as const };
}

export function ClientDetailPanel({
  client,
  onClose,
  onRefresh,
}: {
  client: EnrichedClient | null;
  onClose: () => void;
  onRefresh?: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [assetError, setAssetError] = useState<string | null>(null);
  const { transactions, insights, loading: detailLoading } = useClientDetail(client ? client.id : null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (client) panelRef.current?.focus();
  }, [client]);

  const holdings = useMemo(() => createCanonicalAssetUniverse(client?.assets ?? []), [client?.assets]);
  const livePricing = useQuery({
    queryKey: ["admin", "clients", client?.id, "asset-pricing", holdings.map((holding) => `${holding.id}:${holding.symbol}:${holding.type}`).join("|")],
    queryFn: () => resolveLivePrices(holdings),
    enabled: Boolean(client && holdings.length > 0),
    staleTime: 60_000,
  });

  const valuation = useMemo(() => computePortfolioValuation(holdings, livePricing.data ?? {}), [holdings, livePricing.data]);
  const valuationMap = useMemo(() => Object.fromEntries(valuation.holdings.map((holding) => [holding.id, holding])), [valuation.holdings]);
  const propertyAssets = client?.assets.filter((asset) => asset.type === "property") ?? [];
  const marketAssets = client?.assets.filter((asset) => asset.type === "stock" || asset.type === "mf") ?? [];
  const commodityAssets = client?.assets.filter((asset) => asset.type === "commodity") ?? [];
  const aiAlerts = Array.isArray(insights?.alerts) ? insights.alerts : [];

  const deleteMutation = useMutation({
    mutationFn: (assetId: number) => deleteAsset(assetId),
    onSuccess: async () => {
      setAssetToDelete(null);
      setAssetError(null);
      await queryClient.invalidateQueries({ queryKey: ADMIN_CLIENTS_QUERY_KEY });
      onRefresh?.();
    },
    onError: (value) => setAssetError(toErrorMessage(value)),
  });

  if (!client) return null;

  const occupiedProperties = propertyAssets.filter((asset) => Boolean(asset.tenantName ?? asset.tenant_name)).length;
  const propertyYield = valuation.liveValue > 0 && client.monthlyRentIncome > 0 ? (client.monthlyRentIncome * 12 * 100) / Math.max(client.propertyValue, 1) : 0;
  const topMarketHoldings = [...marketAssets].sort((a, b) => (valuationMap[b.id]?.liveValue ?? b.value ?? 0) - (valuationMap[a.id]?.liveValue ?? a.value ?? 0)).slice(0, 4);
  const topCommodityHolding = [...commodityAssets].sort((a, b) => (valuationMap[b.id]?.liveValue ?? b.value ?? 0) - (valuationMap[a.id]?.liveValue ?? a.value ?? 0))[0];
  const latestEvents = [
    ...transactions.map((transaction) => ({
      id: `txn-${transaction.id}`,
      title: `${transaction.type.toUpperCase()} ${transaction.symbol}`,
      detail: `${transaction.quantity} units · ${fmtCurrency(transaction.total ?? 0)}`,
      timestamp: transaction.date,
    })),
    ...client.assets.map((asset) => ({
      id: `asset-${asset.id}`,
      title: `Asset recorded · ${asset.name}`,
      detail: asset.type === "property" ? asset.location ?? "Property pipeline" : asset.symbol ?? asset.type,
      timestamp: String(asset.createdAt ?? asset.created_at ?? client.createdAt ?? ""),
    })),
  ]
    .filter((event) => event.timestamp)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" aria-hidden="true" onClick={onClose} />
      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Client detail workspace for ${client.name}`}
        className="fixed inset-y-0 right-0 z-50 w-full max-w-[1080px] overflow-y-auto border-l border-sky-400/15 bg-[linear-gradient(160deg,rgba(10,22,51,0.98),rgba(4,9,21,0.99))] p-5 outline-none"
      >
        <div className="sticky top-0 z-10 mb-5 flex flex-col gap-4 rounded-[1.5rem] border border-white/8 bg-[#040915]/95 p-5 backdrop-blur sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-sky-300/70">Institutional intelligence workspace</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">{client.name}</h2>
            <p className="mt-1 text-sm text-slate-400">{client.email} · {client.phone || "Phone pending"}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge label={client.status} />
              <StatusBadge label={client.approvalStatus} />
              <StatusBadge label={client.onboardingStatus ?? "pipeline"} />
            </div>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white">✕</button>
        </div>

        <div className="space-y-4 pb-6">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <IntelligenceWidget eyebrow="Portfolio intelligence" title="Live valuation and exposure" detail="Canonical valuation engine with live price overlays for market-linked holdings.">
              <div className="grid grid-cols-2 gap-3">
                <Metric label="Total value" value={valuation.liveValue > 0 ? fmtCurrency(valuation.liveValue) : client.operationalFallback} />
                <Metric label="Unrealized PnL" value={valuation.liveValue > 0 ? fmtCurrency(valuation.unrealizedPnL) : "Awaiting holdings sync"} accent={valuation.unrealizedPnL >= 0 ? "text-emerald-200" : "text-rose-200"} />
                <Metric label="Live valuation" value={valuation.liveValue > 0 ? fmtPercent(100) : "0%"} />
                <Metric label="Exposure mix" value={`${fmtPercent(client.equityExposurePct)} equity`} />
              </div>
              <div className="mt-4">
                <AllocationRing
                  segments={[
                    { label: "Equity", value: valuation.exposurePct.stock, color: "#38bdf8" },
                    { label: "Funds", value: valuation.exposurePct.mf, color: "#818cf8" },
                    { label: "Property", value: valuation.exposurePct.property, color: "#34d399" },
                    { label: "Commodity", value: valuation.exposurePct.commodity, color: "#f59e0b" },
                  ]}
                />
              </div>
            </IntelligenceWidget>

            <IntelligenceWidget eyebrow="AI intelligence" title="Diversification and alerts" detail="Derived concentration scoring, rebalance pressure, and inactivity watch signals.">
              <div className="grid grid-cols-2 gap-3">
                <Metric label="Diversification" value={`${client.diversificationScore}/100`} />
                <Metric label="Risk concentration" value={client.concentrationRisk} />
                <Metric label="Inactivity" value={client.activitySignal} />
                <Metric label="Rebalance watch" value={client.equityExposurePct > 65 ? "Action required" : "Within policy"} />
              </div>
              <div className="mt-4 space-y-2">
                {aiAlerts.length > 0 ? aiAlerts.slice(0, 4).map((alert, index) => (
                  <div key={index} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-slate-200">
                    {typeof alert === "string" ? alert : alert.title}
                  </div>
                )) : (
                  <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-slate-400">No backend alert payload returned for this client.</div>
                )}
              </div>
            </IntelligenceWidget>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <IntelligenceWidget eyebrow="Real estate operations" title="Tenant, occupancy, and yield" detail="Rent pipeline, tenant coverage, and real estate operating pressure.">
              {propertyAssets.length === 0 ? (
                <OperationalEmptyState title="Property pipeline pending" description="No property assets are linked to this client workspace yet." hint="Real estate onboarding" />
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Metric label="Occupancy" value={`${occupiedProperties}/${propertyAssets.length}`} />
                    <Metric label="Yield" value={propertyYield > 0 ? fmtPercent(propertyYield) : "Awaiting yield data"} />
                    <Metric label="Rent due" value={propertyAssets.map((asset) => dueState(String(asset.rentDueDate ?? asset.rent_due_date)).label).filter((label) => label.startsWith("Due")).length.toString()} />
                    <Metric label="Maintenance alerts" value={propertyAssets.some((asset) => dueState(String(asset.rentDueDate ?? asset.rent_due_date)).tone === "danger") ? "Escalated" : "No backend alerts"} />
                  </div>
                  {propertyAssets.slice(0, 3).map((asset) => {
                    const state = dueState(String(asset.rentDueDate ?? asset.rent_due_date));
                    return (
                      <div key={asset.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">{asset.name}</p>
                            <p className="text-xs text-slate-400">{asset.location || "Location pending"}</p>
                          </div>
                          <StatusBadge label={state.label} tone={state.tone} />
                        </div>
                        <div className="mt-2 text-xs text-slate-300">{asset.tenantName ?? asset.tenant_name ?? "Tenant assignment pending"} · {fmtCurrency(asset.rentAmount ?? asset.rent_amount ?? 0)}/mo</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </IntelligenceWidget>

            <IntelligenceWidget eyebrow="Equity & fund intelligence" title="Top liquid holdings" detail="Live price movement, concentration, and gain/loss across liquid books.">
              {topMarketHoldings.length === 0 ? (
                <OperationalEmptyState title="No active investments" description="No equity or fund holdings are active in this client workspace." hint="Market onboarding" />
              ) : (
                <div className="space-y-3">
                  {topMarketHoldings.map((asset) => {
                    const holding = valuationMap[asset.id];
                    return (
                      <div key={asset.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">{asset.symbol || asset.name}</p>
                            <p className="text-xs text-slate-400">{asset.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-white">{fmtCurrency(holding?.liveValue ?? asset.value ?? 0)}</p>
                            <p className={`text-xs ${(holding?.unrealizedPnL ?? 0) >= 0 ? "text-emerald-200" : "text-rose-200"}`}>{fmtPercent(((holding?.unrealizedPnL ?? 0) / Math.max(holding?.investedValue ?? 1, 1)) * 100, true)}</p>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-slate-300">Allocation {fmtPercent(client.totalNetWorth > 0 ? ((holding?.liveValue ?? asset.value ?? 0) * 100) / client.totalNetWorth : 0)} · {client.concentrationRisk}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </IntelligenceWidget>

            <IntelligenceWidget eyebrow="Commodity intelligence" title="Commodity hedging layer" detail="Exposure, hedge share, and live commodity pricing coverage.">
              {commodityAssets.length === 0 ? (
                <OperationalEmptyState title="Commodity coverage pending" description="This client has no commodity exposure in the live book." hint="Hedge onboarding" />
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Metric label="Commodity exposure" value={fmtPercent(valuation.exposurePct.commodity)} />
                    <Metric label="Hedge share" value={fmtPercent(valuation.exposurePct.commodity)} />
                    <Metric label="Live pricing" value={livePricing.data ? "Connected" : "Awaiting sync"} />
                    <Metric label="Top exposure" value={topCommodityHolding?.name ?? "Awaiting holdings sync"} />
                  </div>
                  {commodityAssets.slice(0, 2).map((asset) => (
                    <div key={asset.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-3 text-sm text-slate-200">
                      {asset.name} · {fmtCurrency(valuationMap[asset.id]?.livePrice ?? asset.currentPrice ?? asset.current_price ?? 0)} live
                    </div>
                  ))}
                </div>
              )}
            </IntelligenceWidget>
          </div>

          <IntelligenceWidget eyebrow="Relationship intelligence" title="Coverage signals" detail="Engagement recency, manager ownership, campaign context, and onboarding notes.">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              <Metric label="Last login" value={fmtDate(client.lastLogin)} />
              <Metric label="Last activity" value={fmtDate(client.lastActivity)} />
              <Metric label="Campaign engagement" value={client.campaignSegmentation || "Segmentation pending"} />
              <Metric label="Onboarding" value={client.onboardingStatus || "Pipeline"} />
              <Metric label="Coverage owner" value={client.relationshipManager || "Unassigned"} />
            </div>
            <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.03] p-4 text-sm text-slate-300">
              {client.notes || "No relationship notes have been written back from the backend yet."}
            </div>
          </IntelligenceWidget>

          <IntelligenceWidget eyebrow="Client activity feed" title="Recent portfolio and transaction events" detail="Chronological operating timeline from holdings and transaction data.">
            {detailLoading ? (
              <div className="text-sm text-slate-400">Loading recent activity…</div>
            ) : latestEvents.length === 0 ? (
              <OperationalEmptyState title="Awaiting first operational event" description="No transactions or asset creation events have been recorded yet." hint="Timeline sync" />
            ) : (
              <div className="space-y-3">
                {latestEvents.map((event) => (
                  <div key={event.id} className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{event.title}</p>
                        <p className="text-xs text-slate-400">{event.detail}</p>
                      </div>
                      <p className="text-xs text-slate-300">{fmtDate(event.timestamp)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </IntelligenceWidget>

          <IntelligenceWidget eyebrow="Canonical asset cards" title="Asset operating layer" detail="Unified layout across stocks, funds, commodities, and property with consistent controls.">
            {client.assets.length === 0 ? (
              <OperationalEmptyState title="Portfolio not onboarded" description="Holdings have not been synced into the client intelligence workspace yet." hint="Asset sync required" />
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {client.assets.map((asset) => {
                  const holding = valuationMap[asset.id];
                  const source = livePricing.data?.[asset.id];
                  const liveValue = holding?.liveValue ?? asset.value ?? 0;
                  const allocationPct = client.totalNetWorth > 0 ? (liveValue * 100) / client.totalNetWorth : 0;
                  return (
                    <AssetCard
                      key={asset.id}
                      asset={asset}
                      allocationPct={allocationPct}
                      livePrice={holding?.livePrice}
                      liveValue={holding?.liveValue}
                      pricePoint={source}
                      onDelete={() => setAssetToDelete(asset)}
                    />
                  );
                })}
              </div>
            )}
          </IntelligenceWidget>
        </div>
      </aside>

      {assetToDelete ? (
        <PlatformConfirmModal
          title="Delete asset"
          description="This asset will be removed from the client portfolio and live allocation intelligence immediately."
          confirmLabel="Delete asset"
          onClose={() => setAssetToDelete(null)}
          onConfirm={() => void deleteMutation.mutateAsync(assetToDelete.id)}
          pending={deleteMutation.isPending}
        />
      ) : null}

      {assetError ? (
        <div className="fixed bottom-4 right-4 z-[95] rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 shadow-2xl">
          {assetError}
        </div>
      ) : null}
    </>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
      <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className={`mt-2 text-sm font-semibold text-white ${accent ?? ""}`}>{value}</p>
    </div>
  );
}
