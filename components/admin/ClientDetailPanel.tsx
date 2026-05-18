"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClientInventoryModal } from "@/components/admin/ClientInventoryModal";
import { AssetCard } from "@/components/admin/platform/AssetCard";
import { AllocationRing } from "@/components/admin/platform/AllocationRing";
import { OperationalEmptyState } from "@/components/admin/platform/EmptyState";
import { IntelligenceWidget } from "@/components/admin/platform/IntelligenceWidget";
import { PlatformConfirmModal } from "@/components/admin/platform/PlatformModal";
import { StatusBadge } from "@/components/admin/platform/StatusBadge";
import { type Asset } from "@/lib/api";
import { fmtCurrency, fmtPercent } from "@/lib/formatters";
import { ADMIN_CLIENTS_QUERY_KEY, type EnrichedClient } from "@/lib/hooks/useAdminClients";
import { ASSETS_KEY } from "@/lib/hooks/useAssets";
import { useClientDetail } from "@/lib/hooks/useClientDetail";
import { createCanonicalAssetUniverse } from "@/lib/services/assets";
import { mutateAdminInventory } from "@/lib/services/adminInventoryService";
import { ALLOWED_TRANSITIONS } from "@/lib/services/clientService";
import { resolveLivePrices } from "@/lib/services/market";
import { computePortfolioValuation } from "@/lib/services/portfolio";
import { toErrorMessage } from "@/lib/fetcher";
import { useAuth } from "@/context/AuthContext";
import { useAbortSafeLifecycle, useOverlayLifecycle } from "@/lib/ui/modalLifecycle";
import { DASHBOARD_FULL_KEY } from "@/context/DashboardContext";
import { adminQueryKeys } from "@/lib/queryKeys/admin";
import { deriveClientReadinessContract } from "@/domains/client";
import { useAdminClientLifecycleMutation, useAdminClientProfile } from "@/domains/admin";

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
  const dueAt = new Date(value).getTime();
  if (!Number.isFinite(dueAt)) return { label: "No rent milestone", tone: "neutral" as const };
  const diff = Math.ceil((dueAt - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: `Overdue ${Math.abs(diff)}d`, tone: "danger" as const };
  if (diff <= 5) return { label: `Due in ${diff}d`, tone: "warn" as const };
  return { label: "On track", tone: "success" as const };
}

export function ClientDetailPanel({
  client,
  onClose,
}: {
  client: EnrichedClient | null;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { authReady, sessionHydrated, authenticated } = useAuth();
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [inventoryEditor, setInventoryEditor] = useState<{ mode: "create" | "edit"; asset?: Asset | null } | null>(null);
  const [inventoryEditorNonce, setInventoryEditorNonce] = useState(0);
  const [pendingClientAction, setPendingClientAction] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    tone?: "danger" | "primary";
    action: "approve" | "suspend" | "archive" | "restore" | "delete";
  } | null>(null);
  const [assetError, setAssetError] = useState<string | null>(null);
  const mutationSequenceRef = useRef(0);
  const {
    transactions,
    insights,
    loading: detailLoading,
    fetching: detailFetching,
    degraded: detailDegraded,
    error: detailError,
    refresh: refreshDetail,
  } = useClientDetail(client?.id ?? null);
  const { profile: canonicalProfile, refresh: refreshCanonicalProfile } = useAdminClientProfile(client?.id ?? null);
  const lifecycleMutation = useAdminClientLifecycleMutation(client?.id ?? null);
  const clearTransientState = useCallback(() => {
    setAssetError(null);
    setAssetToDelete(null);
    setInventoryEditor(null);
    setPendingClientAction(null);
  }, []);
  const handlePanelClose = useCallback(() => {
    clearTransientState();
    onClose();
  }, [clearTransientState, onClose]);
  const { requestClose, isTopMost, stackIndex } = useOverlayLifecycle({
    open: Boolean(client),
    onClose: handlePanelClose,
    type: "drawer",
    lockBodyScroll: Boolean(client),
  });
  const lifecycle = useAbortSafeLifecycle(Boolean(client));

  useEffect(() => {
    if (client) panelRef.current?.focus();
  }, [client]);
  useEffect(() => {
    clearTransientState();
  }, [client?.id, clearTransientState]);

  const requestPanelClose = useCallback(
    (reason: "backdrop" | "cancel" | "programmatic") => {
      clearTransientState();
      requestClose(reason);
    },
    [clearTransientState, requestClose]
  );
  const refreshWorkspaceData = useCallback(() => {
    void refreshDetail();
    void refreshCanonicalProfile();
  }, [refreshCanonicalProfile, refreshDetail]);

  const workspaceClient = useMemo(() => {
    if (!client) return null;
    if (!canonicalProfile) return client;
    return { ...client, ...canonicalProfile };
  }, [client, canonicalProfile]);

  const safeAssets = useMemo(
    () =>
      (Array.isArray(workspaceClient?.assets) ? workspaceClient.assets : []).filter(
        (asset): asset is Asset => Boolean(asset) && Number.isFinite(Number(asset.id))
      ),
    [workspaceClient?.assets]
  );

  const holdings = useMemo(() => createCanonicalAssetUniverse(safeAssets), [safeAssets]);
  const holdingsSignature = useMemo(
    () => holdings.map((holding) => `${holding.id}:${holding.symbol}:${holding.type}`).join("|"),
    [holdings]
  );

  useEffect(() => {
    if (!workspaceClient?.id) return;
    return () => {
      void queryClient.cancelQueries({ queryKey: adminQueryKeys.clientDetail(workspaceClient.id) });
      void queryClient.cancelQueries({ queryKey: adminQueryKeys.clientAssetPricing(workspaceClient.id) });
    };
  }, [queryClient, workspaceClient?.id]);

  const livePricing = useQuery({
    queryKey: adminQueryKeys.clientAssetPricing(client?.id ?? 0, holdingsSignature),
    queryFn: () => resolveLivePrices(holdings),
    enabled: authReady && sessionHydrated && authenticated && Boolean(workspaceClient && holdings.length > 0),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 1,
    placeholderData: (previous) => previous,
  });

  const valuation = useMemo(() => computePortfolioValuation(holdings, livePricing.data ?? {}), [holdings, livePricing.data]);
  const valuationMap = useMemo(() => Object.fromEntries(valuation.holdings.map((holding) => [holding.id, holding])), [valuation.holdings]);
  const propertyAssets = safeAssets.filter((asset) => asset.type === "property");
  const marketAssets = safeAssets.filter((asset) => asset.type === "stock" || asset.type === "mf");
  const commodityAssets = safeAssets.filter((asset) => asset.type === "commodity");
  const aiAlerts = Array.isArray(insights?.alerts) ? insights.alerts : [];
  const readiness = useMemo(
    () =>
      workspaceClient
        ? deriveClientReadinessContract({
            client: workspaceClient,
            assets: safeAssets,
            insights,
            degradedIntelligence: detailDegraded,
          })
        : null,
    [workspaceClient, safeAssets, insights, detailDegraded]
  );
  const operationsReady = Boolean(readiness?.lifecycleReady && readiness?.onboardingReady);
  const allowedTransitions = useMemo(
    () => ALLOWED_TRANSITIONS[workspaceClient?.canonicalStatus ?? "lead"] ?? [],
    [workspaceClient?.canonicalStatus]
  );

  const inventoryMutation = useMutation({
    mutationFn: ({
      action,
      assetId,
      payload,
    }: {
      action: "create" | "update" | "delete";
      assetId?: number;
      payload?: Record<string, unknown>;
    }) =>
      mutateAdminInventory({
        action,
        clientId: Number(client?.id ?? 0),
        assetId,
        payload,
        signal: lifecycle.signal,
      }),
    onSuccess: async (_result, variables) => {
      const refreshStartedAt =
        typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
      console.info("[admin-inventory]", {
        event: "cache-invalidation.start",
        action: variables.action,
        clientId: workspaceClient?.id ?? null,
      });

      const invalidations = [
        queryClient.invalidateQueries({ queryKey: ADMIN_CLIENTS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: DASHBOARD_FULL_KEY }),
        queryClient.invalidateQueries({ queryKey: ASSETS_KEY }),
      ];
      if (workspaceClient?.id != null) {
        invalidations.push(
          queryClient.invalidateQueries({ queryKey: adminQueryKeys.clientDetail(workspaceClient.id) }),
          queryClient.invalidateQueries({ queryKey: adminQueryKeys.clientAssetPricing(workspaceClient.id) }),
          queryClient.invalidateQueries({ queryKey: adminQueryKeys.clientEditDetail(workspaceClient.id) }),
          queryClient.invalidateQueries({ queryKey: adminQueryKeys.clientProfile(workspaceClient.id) })
        );
      }
      await Promise.all(invalidations);

      const refreshDuration =
        typeof performance !== "undefined" && typeof performance.now === "function"
          ? performance.now() - refreshStartedAt
          : Date.now() - refreshStartedAt;
      console.info("[admin-inventory]", {
        event: "cache-invalidation.success",
        action: variables.action,
        clientId: workspaceClient?.id ?? null,
        refreshDurationMs: Number(refreshDuration.toFixed(2)),
      });

      if (!lifecycle.isActive()) return;
      refreshWorkspaceData();
      setAssetError(null);
      setAssetToDelete(null);
      setInventoryEditor(null);
    },
    onError: (value) => {
      if (!lifecycle.isActive()) return;
      setAssetError(toErrorMessage(value));
    },
  });

  if (!workspaceClient) return null;
  const clientId = workspaceClient.id;

  const occupiedProperties = propertyAssets.filter((asset) => Boolean(asset.tenantName ?? asset.tenant_name)).length;
  const propertyYield = valuation.liveValue > 0 && workspaceClient.monthlyRentIncome > 0 ? (workspaceClient.monthlyRentIncome * 12 * 100) / Math.max(workspaceClient.propertyValue, 1) : 0;
  const topMarketHoldings = [...marketAssets].sort((a, b) => (valuationMap[b.id]?.liveValue ?? b.value ?? 0) - (valuationMap[a.id]?.liveValue ?? a.value ?? 0)).slice(0, 4);
  const topCommodityHolding = [...commodityAssets].sort((a, b) => (valuationMap[b.id]?.liveValue ?? b.value ?? 0) - (valuationMap[a.id]?.liveValue ?? a.value ?? 0))[0];
  const latestEvents = [
    {
      id: `client-created-${workspaceClient.id}`,
      title: "Account created",
      detail: workspaceClient.createdAt ? `Client workspace opened · ${workspaceClient.createdAt}` : "Client workspace opened",
      timestamp: String(workspaceClient.createdAt ?? ""),
    },
    workspaceClient.kycStatus === "approved"
      ? {
          id: `client-kyc-${workspaceClient.id}`,
          title: "KYC approved",
          detail: "Compliance verification completed",
          timestamp: String(workspaceClient.lastActivity ?? workspaceClient.createdAt ?? ""),
        }
      : null,
    ...transactions.map((transaction) => ({
      id: `txn-${transaction.id}`,
      title: `${transaction.type.toUpperCase()} ${transaction.symbol}`,
      detail: `${transaction.quantity} units · ${fmtCurrency(transaction.total ?? 0)}`,
      timestamp: transaction.date,
    })),
    ...safeAssets.map((asset) => ({
      id: `asset-${asset.id}`,
      title: `Asset recorded · ${asset.name}`,
      detail: asset.type === "property" ? asset.location ?? "Property pipeline" : asset.symbol ?? asset.type,
      timestamp: String(asset.createdAt ?? asset.created_at ?? workspaceClient.createdAt ?? ""),
    })),
  ]
    .filter((event): event is { id: string; title: string; detail: string; timestamp: string } => Boolean(event && event.timestamp))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 8);

  async function runInventoryMutation({
    action,
    assetId,
    payload,
  }: {
    action: "create" | "update" | "delete";
    assetId?: number;
    payload?: Record<string, unknown>;
  }) {
    if (inventoryMutation.isPending) {
      console.info("[admin-inventory]", {
        event: "mutation.race-detected",
        action,
        clientId,
        blocked: true,
      });
      return;
    }
    mutationSequenceRef.current += 1;
    const sequence = mutationSequenceRef.current;
    console.info("[admin-inventory]", {
      event: "mutation.sequence",
      sequence,
      action,
      clientId,
    });
    await inventoryMutation.mutateAsync({ action, assetId, payload });
  }

  async function refreshInventoryView() {
    if (inventoryMutation.isPending || livePricing.isFetching) return;
    const startedAt =
      typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
    console.info("[admin-inventory]", { event: "refresh.start", clientId });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.clientAssetPricing(clientId) }),
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.clientDetail(clientId) }),
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.clientProfile(clientId) }),
      queryClient.invalidateQueries({ queryKey: ADMIN_CLIENTS_QUERY_KEY }),
    ]);
    // invalidateQueries now auto-refetches active queries; skip explicit livePricing.refetch to prevent duplicate request bursts.
    const duration =
      typeof performance !== "undefined" && typeof performance.now === "function"
        ? performance.now() - startedAt
        : Date.now() - startedAt;
    console.info("[admin-inventory]", {
      event: "refresh.success",
      clientId,
      durationMs: Number(duration.toFixed(2)),
    });
    refreshWorkspaceData();
  }

  const openInventoryEditor = useCallback((mode: "create" | "edit", asset: Asset | null = null) => {
    setAssetError(null);
    setInventoryEditor({ mode, asset });
    setInventoryEditorNonce((value) => value + 1);
  }, []);

  async function runClientAction() {
    if (!pendingClientAction || !workspaceClient || lifecycle.signal.aborted || lifecycleMutation.isPending) return;
    try {
      setAssetError(null);
      await lifecycleMutation.mutateAsync({
        action: pendingClientAction.action,
        signal: lifecycle.signal,
      });
      if (!lifecycle.isActive()) return;
      setPendingClientAction(null);
      if (pendingClientAction.action === "delete") {
        requestPanelClose("programmatic");
        return;
      }
      refreshWorkspaceData();
    } catch (value) {
      if (!lifecycle.isActive()) return;
      setAssetError(toErrorMessage(value));
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        style={{
          zIndex: 1000 + Math.max(stackIndex, 0) * 10,
          opacity: isTopMost ? 1 : 0,
          pointerEvents: isTopMost ? "auto" : "none",
        }}
        aria-hidden="true"
        onClick={() => requestPanelClose("backdrop")}
      />
      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Client detail workspace for ${workspaceClient.name}`}
        className="fixed inset-y-0 right-0 w-full max-w-[1080px] overflow-y-auto overflow-x-hidden border-l border-sky-400/15 bg-[linear-gradient(160deg,rgba(10,22,51,0.98),rgba(4,9,21,0.99))] p-3 sm:p-5 outline-none"
        style={{ zIndex: 1001 + Math.max(stackIndex, 0) * 10 }}
      >
        <div className="sticky top-0 z-10 mb-5 flex flex-col gap-4 rounded-[1.5rem] border border-white/8 bg-[#040915]/95 p-5 backdrop-blur sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-sky-300/70">Institutional intelligence workspace</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">{workspaceClient.name}</h2>
            <p className="mt-1 text-sm text-slate-400">{workspaceClient.email} · {workspaceClient.phone || workspaceClient.whatsapp || "Phone pending"}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge label={workspaceClient.canonicalStatus} />
              <StatusBadge label={workspaceClient.onboardingStatus ?? "pipeline"} />
              <StatusBadge label={workspaceClient.kycStatus ?? "kyc pending"} />
            </div>
            <p className="mt-3 text-xs text-slate-300">
              Advisor {workspaceClient.advisorAssigned || workspaceClient.relationshipManager || "Unassigned"} · Risk {workspaceClient.riskProfile || "Unclassified"} · Planning {workspaceClient.financialPlanningStatus || "Not started"}
            </p>
          </div>
          <button type="button" onClick={() => requestPanelClose("cancel")} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white">✕</button>
        </div>

        <div className="space-y-4 pb-6">
          {detailError ? (
            <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              Intelligence is degraded; the workspace is using the last stable snapshot while refresh runs.
              <button
                type="button"
                onClick={() => {
                  refreshWorkspaceData();
                }}
                className="ml-2 underline"
              >
                {detailFetching ? "Refreshing…" : "Retry now"}
              </button>
            </div>
          ) : null}
          <IntelligenceWidget eyebrow="Operational actions" title="Communication and lifecycle controls" detail="Run client operations directly from this workspace.">
            {!operationsReady ? (
              <OperationalEmptyState title="Operational controls locked" description="Complete onboarding and intelligence sync before executing lifecycle controls." hint="Await readiness" />
            ) : (
              <div className="space-y-3">
                {!readiness?.intelligenceReady ? (
                  <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                    Intelligence data is partial, but lifecycle controls remain available.
                  </div>
                ) : null}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
                  <a href={workspaceClient.whatsapp || workspaceClient.phone ? `https://wa.me/${String(workspaceClient.whatsapp ?? workspaceClient.phone).replace(/\D/g, "")}` : undefined} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-slate-200 text-center">WhatsApp</a>
                  <a href={workspaceClient.phone ? `tel:${String(workspaceClient.phone).replace(/\D/g, "")}` : undefined} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-slate-200 text-center">Call</a>
                  <a href={workspaceClient.email ? `mailto:${workspaceClient.email}` : undefined} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-slate-200 text-center">Email</a>
                  <a href={workspaceClient.email ? `mailto:${workspaceClient.email}?subject=${encodeURIComponent(`Meeting schedule - ${workspaceClient.name}`)}` : undefined} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-slate-200 text-center">Schedule Meeting</a>
                  <a href={workspaceClient.email ? `mailto:${workspaceClient.email}?subject=${encodeURIComponent(`Client report - ${workspaceClient.name}`)}` : undefined} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-slate-200 text-center">Send Report</a>
                  <button type="button" disabled={!allowedTransitions.includes("approved")} onClick={() => setPendingClientAction({ action: "approve", title: "Approve client", description: "Approve this client and move onboarding to live operations.", confirmLabel: "Approve", tone: "primary" })} className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200 disabled:opacity-40">Approve</button>
                  <button type="button" disabled={!allowedTransitions.includes("suspended")} onClick={() => setPendingClientAction({ action: "suspend", title: "Suspend client", description: "Suspend this client from active operations.", confirmLabel: "Suspend", tone: "danger" })} className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200 disabled:opacity-40">Suspend</button>
                  <button type="button" disabled={!allowedTransitions.includes("archived")} onClick={() => setPendingClientAction({ action: "archive", title: "Archive client", description: "Archive this client workspace from active books.", confirmLabel: "Archive", tone: "danger" })} className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 disabled:opacity-40">Archive</button>
                  <button type="button" disabled={workspaceClient.canonicalStatus !== "archived"} onClick={() => setPendingClientAction({ action: "restore", title: "Restore client", description: "Restore this client back to active operating coverage.", confirmLabel: "Restore", tone: "primary" })} className="rounded-xl border border-sky-400/20 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-200 disabled:opacity-40">Restore</button>
                  <button type="button" onClick={() => setPendingClientAction({ action: "delete", title: "Delete client", description: "Permanently delete this client and all operational links.", confirmLabel: "Delete", tone: "danger" })} className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200">Delete</button>
                </div>
              </div>
            )}
          </IntelligenceWidget>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <IntelligenceWidget eyebrow="Portfolio intelligence" title="Live valuation and exposure" detail="Canonical valuation engine with live price overlays for market-linked holdings.">
              {!readiness?.portfolioReady ? (
                <OperationalEmptyState title="Portfolio intelligence inactive" description="Operational portfolio systems activate once onboarding and inventory readiness are complete." hint="Portfolio readiness" />
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Metric label="Total value" value={valuation.liveValue > 0 ? fmtCurrency(valuation.liveValue) : workspaceClient.operationalFallback} />
                    <Metric label="Unrealized PnL" value={valuation.liveValue > 0 ? fmtCurrency(valuation.unrealizedPnL) : "Awaiting holdings sync"} accent={valuation.unrealizedPnL >= 0 ? "text-emerald-200" : "text-rose-200"} />
                    <Metric label="Live valuation" value={valuation.liveValue > 0 ? fmtPercent(100) : "0%"} />
                    <Metric label="Exposure mix" value={`${fmtPercent(workspaceClient.equityExposurePct)} equity`} />
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
                </>
              )}
            </IntelligenceWidget>

            <IntelligenceWidget eyebrow="AI intelligence" title="Diversification and alerts" detail="Derived concentration scoring, rebalance pressure, and inactivity watch signals.">
              {!readiness?.intelligenceReady ? (
                <OperationalEmptyState title="AI intelligence inactive" description="Intelligence systems reactivate automatically once canonical intelligence payloads recover." hint="Intelligence readiness" />
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Metric label="Diversification" value={`${workspaceClient.diversificationScore}/100`} />
                    <Metric label="Risk concentration" value={workspaceClient.concentrationRisk} />
                    <Metric label="Inactivity" value={workspaceClient.activitySignal} />
                    <Metric label="Rebalance watch" value={workspaceClient.equityExposurePct > 65 ? "Action required" : "Within policy"} />
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
                </>
              )}
            </IntelligenceWidget>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <IntelligenceWidget eyebrow="Real estate operations" title="Tenant, occupancy, and yield" detail="Rent pipeline, tenant coverage, and real estate operating pressure.">
              {propertyAssets.length === 0 ? (
                <OperationalEmptyState title="Property pipeline pending" description="No property assets are linked to this client workspace yet." hint="Real estate onboarding" />
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Metric label="Occupancy" value={`${occupiedProperties}/${propertyAssets.length}`} />
                    <Metric label="Yield" value={propertyYield > 0 ? fmtPercent(propertyYield) : "Awaiting yield data"} />
                    <Metric label="Rent due" value={propertyAssets.map((asset) => dueState(String(asset.rentDueDate ?? asset.rent_due_date)).label).filter((label) => label.startsWith("Due")).length.toString()} />
                    <Metric label="Maintenance alerts" value={propertyAssets.some((asset) => dueState(String(asset.rentDueDate ?? asset.rent_due_date)).tone === "danger") ? "Escalated" : "No backend alerts"} />
                  </div>
                  {propertyAssets.slice(0, 3).map((asset) => {
                    const state = dueState(String(asset.rentDueDate ?? asset.rent_due_date));
                    return (
                      <div key={asset.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
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
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">{asset.symbol || asset.name}</p>
                            <p className="text-xs text-slate-400">{asset.name}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-white">{fmtCurrency(holding?.liveValue ?? asset.value ?? 0)}</p>
                            <p className={`text-xs ${(holding?.unrealizedPnL ?? 0) >= 0 ? "text-emerald-200" : "text-rose-200"}`}>{fmtPercent(((holding?.unrealizedPnL ?? 0) / Math.max(holding?.investedValue ?? 1, 1)) * 100, true)}</p>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-slate-300">Allocation {fmtPercent(workspaceClient.totalNetWorth > 0 ? ((holding?.liveValue ?? asset.value ?? 0) * 100) / workspaceClient.totalNetWorth : 0)} · {workspaceClient.concentrationRisk}</div>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            {!readiness?.relationshipReady ? (
              <OperationalEmptyState title="Relationship intelligence inactive" description="Relationship systems activate after canonical advisor/coverage ownership is assigned." hint="Relationship readiness" />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <Metric label="Last login" value={fmtDate(workspaceClient.lastLogin)} />
                  <Metric label="Last activity" value={fmtDate(workspaceClient.lastActivity)} />
                  <Metric label="Campaign engagement" value={workspaceClient.campaignSegmentation || "Segmentation pending"} />
                  <Metric label="Onboarding" value={workspaceClient.onboardingStatus || "Pipeline"} />
                  <Metric label="Coverage owner" value={workspaceClient.relationshipManager || "Unassigned"} />
                  <Metric label="Advisor assigned" value={workspaceClient.advisorAssigned || "Unassigned"} />
                  <Metric label="KYC status" value={workspaceClient.kycStatus || "Pending"} />
                  <Metric label="Risk profile" value={workspaceClient.riskProfile || "Pending"} />
                  <Metric label="Investment objective" value={workspaceClient.investmentObjective || "Pending"} />
                  <Metric label="Financial planning" value={workspaceClient.financialPlanningStatus || "Not started"} />
                </div>
                <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.03] p-4 text-sm text-slate-300">
                  {workspaceClient.notes || "No relationship notes have been written back from the backend yet."}
                </div>
              </>
            )}
          </IntelligenceWidget>

          <IntelligenceWidget eyebrow="Communication center" title="WhatsApp, call, email, reminders" detail="Live communication channels and reminder readiness from client profile signals.">
            {!readiness?.communicationReady ? (
              <OperationalEmptyState title="Communication center inactive" description="No canonical communication channels are currently configured for this workspace." hint="Communication readiness" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <Metric label="WhatsApp" value={workspaceClient.whatsapp || workspaceClient.phone || "Not mapped"} />
                <Metric label="Email channel" value={workspaceClient.email || "Not mapped"} />
                <Metric label="Call channel" value={workspaceClient.phone || "Not mapped"} />
                <Metric label="Reminder status" value={workspaceClient.notificationPreferences.push ? "Enabled" : "Manual"} />
              </div>
            )}
          </IntelligenceWidget>

          <IntelligenceWidget eyebrow="Advisory system" title="Recommendation feed" detail="Advisor-led recommendations and follow-up signals from live intelligence payloads.">
            {!readiness?.advisoryReady ? (
              <OperationalEmptyState title="Advisory system inactive" description="Advisory recommendations will activate once canonical intelligence alerts are available." hint="Advisory readiness" />
            ) : aiAlerts.length === 0 ? (
              <OperationalEmptyState title="No advisory recommendations" description="No recommendation records have been returned by backend intelligence yet." hint="Advisory sync" />
            ) : (
              <div className="space-y-3">
                {aiAlerts.slice(0, 6).map((alert, index) => (
                  <div key={index} className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                    <p className="text-sm font-semibold text-white">{typeof alert === "string" ? alert : alert.title}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Advisor {workspaceClient.advisorAssigned || workspaceClient.relationshipManager || "Unassigned"} · {fmtDate(workspaceClient.lastActivity ?? workspaceClient.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
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
                    <div className="flex flex-wrap items-start justify-between gap-3">
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
            <div className="mb-3 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                disabled={inventoryMutation.isPending}
                onClick={() => openInventoryEditor("create", null)}
                className="rounded-xl border border-sky-300/30 bg-sky-500/15 px-3 py-2 text-xs font-semibold text-sky-100 transition hover:bg-sky-500/25 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Add inventory
              </button>
              <button
                type="button"
                disabled={inventoryMutation.isPending || livePricing.isFetching}
                onClick={() => void refreshInventoryView()}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {livePricing.isFetching ? "Refreshing…" : "Refresh valuation"}
              </button>
            </div>
            {safeAssets.length === 0 ? (
              <OperationalEmptyState
                title="Portfolio not onboarded"
                description="Holdings have not been synced into the client intelligence workspace yet."
                hint="Asset sync required"
                action={
                  <button
                    type="button"
                    disabled={inventoryMutation.isPending}
                    onClick={() => openInventoryEditor("create", null)}
                    className="rounded-xl bg-sky-400 px-4 py-2 text-sm font-semibold text-[#04102a] transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Add inventory
                  </button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {safeAssets.map((asset) => {
                  const holding = valuationMap[asset.id];
                  const source = livePricing.data?.[asset.id];
                  const liveValue = holding?.liveValue ?? asset.value ?? 0;
                  const allocationPct = workspaceClient.totalNetWorth > 0 ? (liveValue * 100) / workspaceClient.totalNetWorth : 0;
                  return (
                    <AssetCard
                      key={asset.id}
                      asset={asset}
                      allocationPct={allocationPct}
                      livePrice={holding?.livePrice}
                      liveValue={holding?.liveValue}
                      pricePoint={source}
                      onEdit={inventoryMutation.isPending ? undefined : () => openInventoryEditor("edit", asset)}
                      onDelete={inventoryMutation.isPending ? undefined : () => setAssetToDelete(asset)}
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
          onClose={() => (inventoryMutation.isPending ? undefined : setAssetToDelete(null))}
          onConfirm={() => void runInventoryMutation({ action: "delete", assetId: assetToDelete.id })}
          pending={inventoryMutation.isPending}
        />
      ) : null}

      {inventoryEditor ? (
        <ClientInventoryModal
          key={`inventory-editor-${inventoryEditorNonce}-${inventoryEditor.mode}-${inventoryEditor.asset?.id ?? "new"}`}
          mode={inventoryEditor.mode}
          initialAsset={inventoryEditor.asset ?? null}
          pending={inventoryMutation.isPending}
          error={assetError}
          onClose={() => {
            if (inventoryMutation.isPending) return;
            setInventoryEditor(null);
          }}
          onSubmit={async (payload) => {
            setAssetError(null);
            await runInventoryMutation({
              action: inventoryEditor.mode === "create" ? "create" : "update",
              assetId: inventoryEditor.asset?.id,
              payload,
            });
          }}
        />
      ) : null}

      {pendingClientAction ? (
        <PlatformConfirmModal
          title={pendingClientAction.title}
          description={pendingClientAction.description}
          confirmLabel={pendingClientAction.confirmLabel}
          onClose={() => setPendingClientAction(null)}
          onConfirm={() => void runClientAction()}
          pending={lifecycleMutation.isPending}
          tone={pendingClientAction.tone}
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
