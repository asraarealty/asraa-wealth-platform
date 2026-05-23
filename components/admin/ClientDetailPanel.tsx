"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClientInventoryModal } from "@/components/admin/ClientInventoryModal";
import { AssetCard } from "@/components/admin/platform/AssetCard";
import { StatusBadge } from "@/components/admin/platform/StatusBadge";
import { PlatformConfirmModal } from "@/components/admin/platform/PlatformModal";
import { ClientOnboardingStatusCard } from "@/components/admin/onboarding/ClientOnboardingStatusCard";
import {
  ActionBar,
  AllocationChart,
  AsyncBoundary,
  EmptyState,
  HoldingsTable,
  IntelligencePanel,
  KPIGrid,
  OperationalDrawer,
  PartialFailureBanner,
  RiskPanel,
  WorkspaceTabs,
  type WorkspaceMode,
} from "@/components/admin/workspace/primitives";
import { type Asset } from "@/lib/api";
import { fmtCurrency, fmtPercent } from "@/lib/formatters";
import { ADMIN_CLIENTS_QUERY_KEY, type EnrichedClient } from "@/lib/hooks/useAdminClients";
import { ASSETS_KEY } from "@/lib/hooks/useAssets";
import { useClientDetail } from "@/lib/hooks/useClientDetail";
import { createCanonicalAssetUniverse } from "@/lib/services/assets";
import { mutateAdminInventory } from "@/lib/services/adminInventoryService";
import { ALLOWED_TRANSITIONS } from "@/lib/services/clientService";
import { toLifecycleErrorMessage } from "@/lib/services/clientLifecycleErrors";
import { resolveLivePrices } from "@/lib/services/market";
import { computePortfolioValuation } from "@/lib/services/portfolio";
import { toErrorMessage } from "@/lib/fetcher";
import { useAuth } from "@/context/AuthContext";
import { useAbortSafeLifecycle, useOverlayLifecycle } from "@/lib/ui/modalLifecycle";
import { DASHBOARD_FULL_KEY } from "@/context/DashboardContext";
import { adminQueryKeys } from "@/lib/queryKeys/admin";
import { deriveClientReadinessContract } from "@/domains/client";
import { useAdminClientLifecycleMutation, useAdminClientProfile } from "@/domains/admin";
import { toPortfolioHolding } from "@/domains/portfolio";

const INITIAL_WORKSPACE_MODE: WorkspaceMode = "portfolio";
const DRAWER_BG_GRADIENT = "bg-[linear-gradient(160deg,rgba(10,22,51,0.98),rgba(4,9,21,0.99))]";

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

function toReadinessMetric(label: string, ready: boolean | undefined, readyValue: string, blockedValue: string) {
  return {
    label,
    value: ready ? readyValue : blockedValue,
    tone: ready ? ("good" as const) : ("warn" as const),
  };
}

export function ClientDetailPanel({
  client,
  onClose,
  initialMode = INITIAL_WORKSPACE_MODE,
}: {
  client: EnrichedClient | null;
  onClose: () => void;
  initialMode?: WorkspaceMode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { authReady, sessionHydrated, authenticated } = useAuth();
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [inventoryEditor, setInventoryEditor] = useState<{ mode: "create" | "edit"; asset?: Asset | null } | null>(null);
  const [inventoryEditorNonce, setInventoryEditorNonce] = useState(0);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>(initialMode);
  const [pendingClientAction, setPendingClientAction] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    tone?: "danger" | "primary";
    action: "approve" | "suspend" | "archive" | "restore" | "delete";
    requireTypedConfirmation?: string;
  } | null>(null);
  const [assetError, setAssetError] = useState<string | null>(null);
  const [lifecycleSuccess, setLifecycleSuccess] = useState<string | null>(null);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState("");
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
    setWorkspaceMode(initialMode);
    setLifecycleSuccess(null);
    setDeleteConfirmationInput("");
  }, [client?.id, clearTransientState, initialMode]);

  // Telemetry: workspace open / close
  const prevClientIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (typeof window === "undefined" || process.env.NODE_ENV === "production") return;
    const clientId = client?.id ?? null;
    if (clientId !== null && clientId !== prevClientIdRef.current) {
      console.info("[workspace-open]", { event: "workspace.open", clientId });
    }
    if (clientId === null && prevClientIdRef.current !== null) {
      console.info("[workspace-close]", { event: "workspace.close", clientId: prevClientIdRef.current });
    }
    prevClientIdRef.current = clientId;
  }, [client?.id]);

  // Telemetry: panel unmount cleanup
  useEffect(() => {
    return () => {
      if (typeof window === "undefined" || process.env.NODE_ENV === "production") return;
      console.info("[panel-unmount]", { event: "panel.unmount", clientId: prevClientIdRef.current ?? null });
    };
  }, []);

  const requestPanelClose = useCallback(
    (reason: "backdrop" | "cancel" | "programmatic") => {
      if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
        console.info("[overlay]", { event: "panel.close-requested", reason, clientId: prevClientIdRef.current ?? null });
      }
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

  // Telemetry: workspace hydration — fires each time live holdings arrive or change
  useEffect(() => {
    if (!workspaceClient?.id || typeof window === "undefined" || process.env.NODE_ENV === "production") return;
    console.info("[workspace-hydration]", {
      event: "hydration.holdings",
      clientId: workspaceClient.id,
      holdingsCount: holdings.length,
      holdingsSignature,
      livePricingReady: !livePricing.isPending,
      degraded: detailDegraded,
    });
  }, [workspaceClient?.id, holdings.length, holdingsSignature, livePricing.isPending, detailDegraded]);

  const valuation = useMemo(() => computePortfolioValuation(holdings, livePricing.data ?? {}), [holdings, livePricing.data]);
  const valuationMap = useMemo(() => Object.fromEntries(valuation.holdings.map((holding) => [holding.id, holding])), [valuation.holdings]);
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
  const readinessSignature = useMemo(
    () =>
      readiness
        ? [
            readiness.onboardingReady,
            readiness.intelligenceReady,
            readiness.inventoryReady,
            readiness.advisoryReady,
            readiness.communicationReady,
            readiness.portfolioReady,
            readiness.relationshipReady,
            readiness.lifecycleReady,
          ].join("|")
        : "none",
    [readiness]
  );
  useEffect(() => {
    if (!workspaceClient || typeof window === "undefined" || process.env.NODE_ENV === "production") return;
    const alertsCount = Array.isArray(insights?.alerts) ? insights.alerts.length : 0;
    console.info("[selector]", {
      clientId: workspaceClient.id,
      assetsCount: safeAssets.length,
      holdingsCount: holdings.length,
      transactionsCount: transactions.length,
      insightAlertsCount: alertsCount,
      degraded: detailDegraded,
    });
    console.info("[workspace]", {
      clientId: workspaceClient.id,
      operationsReady,
      readinessSignature,
      fallbackActivationReason: detailError ?? null,
    });
    console.info("[readiness]", {
      event: "readiness.update",
      clientId: workspaceClient.id,
      ...readiness,
      readinessSignature,
      degradedIntelligence: detailDegraded,
      degradedActivationReason: detailDegraded ? (detailError ?? "partialError") : null,
    });
  }, [
    detailDegraded,
    detailError,
    holdings.length,
    readiness,
    readinessSignature,
    operationsReady,
    safeAssets.length,
    transactions.length,
    workspaceClient,
    insights?.alerts?.length,
  ]);
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

  const allocationSegments = useMemo(
    () => [
      {
        label: "Stocks",
        value: valuation.holdings.filter((holding) => holding.type === "stock").reduce((sum, holding) => sum + holding.liveValue, 0),
        color: "#38bdf8",
      },
      {
        label: "Mutual Funds",
        value: valuation.holdings.filter((holding) => holding.type === "mf").reduce((sum, holding) => sum + holding.liveValue, 0),
        color: "#818cf8",
      },
      {
        label: "Property",
        value: valuation.holdings.filter((holding) => holding.type === "property").reduce((sum, holding) => sum + holding.liveValue, 0),
        color: "#34d399",
      },
      {
        label: "Commodities",
        value: valuation.holdings.filter((holding) => holding.type === "commodity").reduce((sum, holding) => sum + holding.liveValue, 0),
        color: "#f59e0b",
      },
    ],
    [valuation.holdings]
  );

  const holdingsRows = useMemo(
    () =>
      safeAssets
        .map((asset) => {
          const num = (value: unknown) => {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : 0;
          };
          const record = asset as unknown as Record<string, unknown>;
          const holding = valuationMap[asset.id];
          const liveValue = num(record.current_value ?? record.currentValue ?? record.value);
          const investedValue = num(record.invested_value ?? record.investedValue);
          const unrealizedPnL = num(
            record.profit_loss ?? record.profitLoss ?? record.unrealized_pnl ?? record.unrealizedPnL ?? record.gain_loss ?? record.gainLoss ?? 0
          );
          const returnPercentage = num(record.return_percentage ?? record.returnPercent ?? record.return_percent);
          const allocationPct = num(record.allocation_percent ?? record.allocationPercent ?? record.allocation);
          return {
            key: `${workspaceClient.id}-${asset.id}`,
            clientId: workspaceClient.id,
            clientName: workspaceClient.name,
            lifecycle: workspaceClient.canonicalStatus,
            assetName: asset.name,
            symbol: asset.symbol ?? undefined,
            assetType: asset.type,
            units: Number(asset.quantity ?? 0),
            livePrice: holding?.livePrice ?? asset.currentPrice ?? asset.current_price ?? 0,
            liveValue,
            investedValue,
            allocationPct,
            unrealizedPnL,
            unrealizedPnLPct: returnPercentage,
            quoteConnected: Boolean(livePricing.data?.[asset.id]),
            groupingLabel:
              asset.type === "stock"
                ? "Equity"
                : asset.type === "mf"
                  ? "Fund"
                  : asset.type === "commodity"
                    ? "Commodity"
                    : "Property",
            assetId: Number(asset.id),
          };
        })
        .sort((a, b) => b.liveValue - a.liveValue),
    [livePricing.data, safeAssets, valuationMap, workspaceClient.canonicalStatus, workspaceClient.id, workspaceClient.name]
  );

  const overviewKpis = useMemo(
    () => {
      return [
      { label: "Net worth", value: valuation.liveValue > 0 ? fmtCurrency(valuation.liveValue) : workspaceClient.operationalFallback },
      { label: "Diversification", value: `${workspaceClient.diversificationScore}/100` },
      toReadinessMetric("AI health score", readiness?.intelligenceReady, "Healthy", "Partial"),
      toReadinessMetric("Lifecycle readiness", readiness?.lifecycleReady, "Ready", "Blocked"),
      { label: "Exposure mix", value: `Eq ${fmtPercent(valuation.exposurePct.stock)} · MF ${fmtPercent(valuation.exposurePct.mf)}` },
      { label: "Onboarding progress", value: workspaceClient.onboardingStatus || "Pipeline" },
      { label: "Last activity", value: fmtDate(workspaceClient.lastActivity ?? workspaceClient.createdAt) },
      { label: "Advisor", value: workspaceClient.advisorAssigned || workspaceClient.relationshipManager || "Unassigned" },
    ];
    },
    [
      readiness?.intelligenceReady,
      readiness?.lifecycleReady,
      valuation.exposurePct.mf,
      valuation.exposurePct.stock,
      valuation.liveValue,
      workspaceClient.advisorAssigned,
      workspaceClient.createdAt,
      workspaceClient.diversificationScore,
      workspaceClient.lastActivity,
      workspaceClient.onboardingStatus,
      workspaceClient.operationalFallback,
      workspaceClient.relationshipManager,
    ]
  );

  const keyAlerts = useMemo(
    () => [
      workspaceClient.equityExposurePct > 65 ? "Equity concentration above policy threshold" : null,
      workspaceClient.concentrationRisk.toLowerCase().includes("high") ? "Concentration risk elevated" : null,
      workspaceClient.activitySignal.toLowerCase().includes("inactive") ? "Client inactivity requires follow-up" : null,
      !readiness?.onboardingReady ? "Onboarding workflow is incomplete" : null,
      ...aiAlerts.slice(0, 2).map((alert) => (typeof alert === "string" ? alert : alert.title)),
    ].filter(Boolean) as string[],
    [
      aiAlerts,
      readiness?.onboardingReady,
      workspaceClient.activitySignal,
      workspaceClient.concentrationRisk,
      workspaceClient.equityExposurePct,
    ]
  );

  const topRecommendations = useMemo(
    () => [
      workspaceClient.equityExposurePct > 65 ? "Trigger rebalance review to reduce equity drift" : "Maintain current allocation band",
      !readiness?.communicationReady ? "Map communication channels for service ops" : "Send periodic client report",
      valuation.exposurePct.commodity < 5 ? "Assess hedge overlay for downside protection" : "Hedge coverage active",
      workspaceClient.kycStatus !== "approved" ? "Complete KYC to unlock lifecycle transitions" : "KYC verified",
    ],
    [
      readiness?.communicationReady,
      valuation.exposurePct.commodity,
      workspaceClient.equityExposurePct,
      workspaceClient.kycStatus,
    ]
  );

  const intelligenceSignals = useMemo(
    () => [
      {
        title: "Diversification analysis",
        signal: workspaceClient.diversificationScore >= 70 ? "Balanced structure" : "Diversification gap detected",
        confidence: workspaceClient.diversificationScore >= 70 ? "87%" : "78%",
        priority: workspaceClient.diversificationScore >= 70 ? "Medium" : "High",
      },
      {
        title: "Concentration risk",
        signal: workspaceClient.concentrationRisk,
        confidence: "82%",
        priority: workspaceClient.concentrationRisk.toLowerCase().includes("high") ? "High" : "Medium",
      },
      {
        title: "Allocation imbalance",
        signal: workspaceClient.equityExposurePct > 65 ? "Equity overweight" : "Within allocation policy",
        confidence: "84%",
        priority: workspaceClient.equityExposurePct > 65 ? "High" : "Low",
      },
      {
        title: "Inactivity watch",
        signal: workspaceClient.activitySignal,
        confidence: "73%",
        priority: workspaceClient.activitySignal.toLowerCase().includes("inactive") ? "High" : "Medium",
      },
      {
        title: "Market regime",
        signal: detailDegraded ? "Partial signal availability" : "Signal feed healthy",
        confidence: detailDegraded ? "61%" : "79%",
        priority: detailDegraded ? "Medium" : "Low",
      },
      {
        title: "Advisory opportunity",
        signal: aiAlerts.length > 0 ? `${aiAlerts.length} actionable recommendations` : "No immediate advisory opportunity",
        confidence: aiAlerts.length > 0 ? "76%" : "58%",
        priority: aiAlerts.length > 0 ? "Medium" : "Low",
      },
    ],
    [
      aiAlerts.length,
      detailDegraded,
      workspaceClient.activitySignal,
      workspaceClient.concentrationRisk,
      workspaceClient.diversificationScore,
      workspaceClient.equityExposurePct,
    ]
  );

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
      setLifecycleSuccess(null);
      if (pendingClientAction.action === "delete" && workspaceClient.canonicalStatus !== "archived") {
        throw new Error("Permanent delete is only available for archived clients.");
      }
      await lifecycleMutation.mutateAsync({
        action: pendingClientAction.action,
        signal: lifecycle.signal,
        currentStatus: workspaceClient.canonicalStatus,
      });
      if (!lifecycle.isActive()) return;
      setPendingClientAction(null);
      setDeleteConfirmationInput("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ADMIN_CLIENTS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: DASHBOARD_FULL_KEY }),
        queryClient.invalidateQueries({ queryKey: ASSETS_KEY }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.clientDetail(workspaceClient.id) }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.clientProfile(workspaceClient.id) }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.clientAssetPricing(workspaceClient.id) }),
      ]);
      if (pendingClientAction.action === "delete") {
        setLifecycleSuccess("Client permanently deleted");
        refreshWorkspaceData();
        return;
      }
      if (pendingClientAction.action === "restore") {
        setLifecycleSuccess("Client restored successfully");
      } else if (pendingClientAction.action === "archive") {
        setLifecycleSuccess("Client archived successfully.");
      } else if (pendingClientAction.action === "approve") {
        setLifecycleSuccess("Lead converted successfully.");
      } else if (pendingClientAction.action === "suspend") {
        setLifecycleSuccess("Client status updated successfully.");
      }
      refreshWorkspaceData();
    } catch (value) {
      if (!lifecycle.isActive()) return;
      setAssetError(toLifecycleErrorMessage(value, pendingClientAction.action));
    }
  }

  return (
    <>
      <OperationalDrawer
        backdrop={
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
        }
        panel={
          <aside
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={`Client operating system for ${workspaceClient.name}`}
            className={`fixed inset-y-0 right-0 w-full max-w-[1180px] overflow-y-auto overflow-x-hidden border-l border-sky-400/15 ${DRAWER_BG_GRADIENT} p-3 sm:p-5 outline-none`}
            style={{ zIndex: 1001 + Math.max(stackIndex, 0) * 10 }}
          >
            <div className="sticky top-0 z-20 mb-4 space-y-3 rounded-[1.25rem] border border-white/8 bg-[#040915]/95 p-4 backdrop-blur">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-sky-300/70">Client operating system</p>
                  <div className="mt-1 flex items-center gap-2">
                    <h2 className="text-xl font-semibold text-white sm:text-2xl">{workspaceClient.name}</h2>
                    {workspaceClient.canonicalStatus === "archived" ? <StatusBadge label={workspaceClient.canonicalStatus} tone="danger" /> : null}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{workspaceClient.email} · {workspaceClient.phone || workspaceClient.whatsapp || "Pending"}</p>
                </div>
                <button type="button" onClick={() => requestPanelClose("cancel")} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white">
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 xl:grid-cols-7">
                <div className="rounded-lg border border-white/8 bg-white/[0.03] p-2"><p className="text-slate-400">Lifecycle</p><p className="mt-1 font-semibold text-white">{workspaceClient.canonicalStatus}</p></div>
                <div className="rounded-lg border border-white/8 bg-white/[0.03] p-2"><p className="text-slate-400">Portfolio</p><p className="mt-1 font-semibold text-white">{valuation.liveValue > 0 ? fmtCurrency(valuation.liveValue) : workspaceClient.operationalFallback}</p></div>
                <div className="rounded-lg border border-white/8 bg-white/[0.03] p-2"><p className="text-slate-400">Advisor</p><p className="mt-1 font-semibold text-white">{workspaceClient.advisorAssigned || workspaceClient.relationshipManager || "Unassigned"}</p></div>
                <div className="rounded-lg border border-white/8 bg-white/[0.03] p-2"><p className="text-slate-400">Risk</p><p className="mt-1 font-semibold text-white">{workspaceClient.riskProfile || "Pending"}</p></div>
                <div className="rounded-lg border border-white/8 bg-white/[0.03] p-2"><p className="text-slate-400">Onboarding</p><p className="mt-1 font-semibold text-white">{workspaceClient.onboardingStatus || "Pipeline"}</p></div>
                <div className="rounded-lg border border-white/8 bg-white/[0.03] p-2"><p className="text-slate-400">Last activity</p><p className="mt-1 font-semibold text-white">{fmtDate(workspaceClient.lastActivity ?? workspaceClient.createdAt)}</p></div>
                <div className="rounded-lg border border-white/8 bg-white/[0.03] p-2"><p className="text-slate-400">AI health</p><p className="mt-1 font-semibold text-white">{readiness?.intelligenceReady ? "Healthy" : "Partial"}</p></div>
              </div>

              <ActionBar>
                <button type="button" onClick={() => openInventoryEditor("create", null)} className="rounded-lg border border-sky-300/30 bg-sky-500/15 px-3 py-2 text-xs font-semibold text-sky-100">
                  Add Holding
                </button>
                <button type="button" onClick={() => setWorkspaceMode("portfolio")} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200">
                  Rebalance
                </button>
                <a href={workspaceClient.email ? `mailto:${workspaceClient.email}?subject=${encodeURIComponent(`Portfolio report - ${workspaceClient.name}`)}` : undefined} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200">
                  Send Report
                </a>
                <a href={workspaceClient.whatsapp || workspaceClient.phone ? `https://wa.me/${String(workspaceClient.whatsapp ?? workspaceClient.phone).replace(/\D/g, "")}` : undefined} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200">
                  Contact
                </a>
                <Link href={`/admin/clients/${workspaceClient.id}/edit`} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200">
                  Edit Client
                </Link>
              </ActionBar>

              <WorkspaceTabs value={workspaceMode} onChange={setWorkspaceMode} />
            </div>

            <div className="space-y-4 pb-6">
              {detailError ? (
                <PartialFailureBanner
                  message="Intelligence is partially available. Last stable data is shown."
                  onRetry={refreshWorkspaceData}
                  pending={detailFetching}
                />
              ) : null}

              {workspaceMode === "overview" ? (
                <div className="space-y-4">
                  <KPIGrid items={overviewKpis} />
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <IntelligencePanel title="Key alerts" sub="Priority operating signals">
                      {keyAlerts.length === 0 ? (
                        <EmptyState title="No critical alerts" detail="No high-priority alerts were detected for this client." />
                      ) : (
                        <div className="space-y-2">
                          {keyAlerts.slice(0, 6).map((alert) => (
                            <div key={alert} className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 text-sm text-slate-200">
                              {alert}
                            </div>
                          ))}
                        </div>
                      )}
                    </IntelligencePanel>
                    <IntelligencePanel title="Top recommendations" sub="Next best actions">
                      <div className="space-y-2">
                        {topRecommendations.map((item) => (
                          <div key={item} className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 text-sm text-slate-200">
                            {item}
                          </div>
                        ))}
                      </div>
                    </IntelligencePanel>
                  </div>
                </div>
              ) : null}

              {workspaceMode === "portfolio" ? (
                <div className="space-y-4">
                  <IntelligencePanel title="Portfolio operating center" sub="Live valuation, allocation, P&L, and asset actions">
                    <KPIGrid
                      items={[
                        { label: "Live value", value: fmtCurrency(valuation.liveValue) },
                        { label: "Invested value", value: fmtCurrency(valuation.investedValue) },
                        { label: "Unrealized P&L", value: `${fmtCurrency(valuation.unrealizedPnL)} (${fmtPercent(valuation.unrealizedPnLPct, true)})`, tone: valuation.unrealizedPnL >= 0 ? "good" : "bad" },
                        { label: "Live pricing", value: livePricing.isFetching ? "Refreshing" : "Connected", tone: livePricing.isFetching ? "warn" : "good" },
                      ]}
                    />
                  </IntelligencePanel>

                  <AsyncBoundary loading={detailLoading} error={null} loadingLabel="Loading holdings view…">
                    <HoldingsTable
                      rows={holdingsRows}
                      onOpenClient={(id) => {
                        if (id !== workspaceClient.id) return;
                      }}
                      onEditAsset={(assetId) => {
                        const asset = safeAssets.find((item) => Number(item.id) === assetId) ?? null;
                        if (!asset) return;
                        openInventoryEditor("edit", asset);
                      }}
                      onDeleteAsset={(assetId) => {
                        const asset = safeAssets.find((item) => Number(item.id) === assetId) ?? null;
                        if (!asset) return;
                        setAssetToDelete(asset);
                      }}
                      onOpenIntelligence={() => setWorkspaceMode("intelligence")}
                    />
                  </AsyncBoundary>

                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                    <IntelligencePanel title="Asset distribution" sub="Grouped asset classes and exposure mix">
                      <AllocationChart segments={allocationSegments} />
                    </IntelligencePanel>
                    <IntelligencePanel title="Risk and rebalance" sub="Exposure thresholds and action flags">
                      <RiskPanel
                        items={[
                          { label: "Concentration risk", value: workspaceClient.concentrationRisk, tone: workspaceClient.concentrationRisk.toLowerCase().includes("high") ? "bad" : "warn" },
                          { label: "Equity exposure", value: fmtPercent(valuation.exposurePct.stock), tone: valuation.exposurePct.stock > 65 ? "warn" : "good" },
                          { label: "Diversification", value: `${workspaceClient.diversificationScore}/100`, tone: workspaceClient.diversificationScore >= 70 ? "good" : "warn" },
                          { label: "Rebalance suggestion", value: valuation.exposurePct.stock > 65 ? "Reduce equity concentration" : "Within policy", tone: valuation.exposurePct.stock > 65 ? "warn" : "good" },
                          { label: "Watchlist linkage", value: topMarketHoldings.length > 0 ? `${topMarketHoldings.length} tracked leaders` : "No linked watchlist", tone: topMarketHoldings.length > 0 ? "good" : "default" },
                          { label: "Top exposure", value: topCommodityHolding?.name ?? topMarketHoldings[0]?.name ?? "Awaiting holdings sync" },
                        ]}
                      />
                    </IntelligencePanel>
                  </div>
                </div>
              ) : null}

              {workspaceMode === "operations" ? (
                <div className="space-y-4">
                  <IntelligencePanel title="Onboarding command center" sub="Progress, documents, processing status, advisor actions, and activation controls">
                    <ClientOnboardingStatusCard client={workspaceClient} />
                  </IntelligencePanel>

                  <IntelligencePanel title="Lifecycle controls" sub="Onboarding, KYC, approvals, and workflow transitions">
                    {!operationsReady ? (
                      <EmptyState title="Operations locked" detail="Complete onboarding and intelligence prerequisites to unlock lifecycle controls." />
                    ) : (
                      <ActionBar>
                        <button type="button" disabled={workspaceClient.canonicalStatus !== "lead" || !allowedTransitions.includes("approved")} onClick={() => setPendingClientAction({ action: "approve", title: "Convert lead", description: "Convert this lead into an approved client profile for operational onboarding.", confirmLabel: "Convert to Client", tone: "primary" })} className="rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-200 disabled:opacity-40">
                          Convert to Client
                        </button>
                        <button type="button" disabled={workspaceClient.canonicalStatus !== "active" || !allowedTransitions.includes("archived")} onClick={() => setPendingClientAction({ action: "archive", title: "Archive client", description: "Archive this client workspace from active books.", confirmLabel: "Archive", tone: "danger" })} className="rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200 disabled:opacity-40">
                          Archive
                        </button>
                        {workspaceClient.canonicalStatus === "suspended" ? (
                          <button type="button" onClick={() => setPendingClientAction({ action: "restore", title: "Reactivate client", description: "Reactivate this suspended client into active runtime operations.", confirmLabel: "Reactivate", tone: "primary" })} className="rounded-lg border border-sky-400/20 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-200">
                            Reactivate
                          </button>
                        ) : null}
                        {workspaceClient.canonicalStatus === "archived" ? (
                          <button type="button" onClick={() => setPendingClientAction({ action: "restore", title: "Restore client", description: "Restore this client back to active operating coverage.", confirmLabel: "Restore", tone: "primary" })} className="rounded-lg border border-sky-400/20 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-200">
                            Restore
                          </button>
                        ) : null}
                        {workspaceClient.canonicalStatus === "archived" ? (
                          <button type="button" onClick={() => setPendingClientAction({ action: "delete", title: "Delete client permanently", description: "Permanently delete this archived client and all operational runtime links. This action cannot be undone.", confirmLabel: "Delete Permanently", tone: "danger", requireTypedConfirmation: "DELETE" })} className="rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200">
                            Delete Permanently
                          </button>
                        ) : null}
                      </ActionBar>
                    )}
                  </IntelligencePanel>

                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <IntelligencePanel title="Onboarding and service operations" sub="KYC, lifecycle, reminders, advisor tasks">
                      <KPIGrid
                        items={[
                          { label: "Onboarding", value: workspaceClient.onboardingStatus || "Pipeline", tone: readiness?.onboardingReady ? "good" : "warn" },
                          { label: "KYC", value: workspaceClient.kycStatus || "Pending", tone: workspaceClient.kycStatus === "approved" ? "good" : "warn" },
                          { label: "Communication", value: readiness?.communicationReady ? "Configured" : "Pending", tone: readiness?.communicationReady ? "good" : "warn" },
                          { label: "Advisor tasks", value: latestEvents.length > 0 ? `${latestEvents.length} recent events` : "No open tasks" },
                        ]}
                      />
                    </IntelligencePanel>
                    <IntelligencePanel title="Communication channels" sub="Client contact and reminder routing">
                      <RiskPanel
                        items={[
                          { label: "WhatsApp", value: workspaceClient.whatsapp || workspaceClient.phone || "Not mapped", tone: workspaceClient.whatsapp || workspaceClient.phone ? "good" : "warn" },
                          { label: "Email", value: workspaceClient.email || "Not mapped", tone: workspaceClient.email ? "good" : "warn" },
                          { label: "Phone", value: workspaceClient.phone || "Not mapped", tone: workspaceClient.phone ? "good" : "warn" },
                          { label: "Reminder status", value: workspaceClient.notificationPreferences.push ? "Enabled" : "Manual", tone: workspaceClient.notificationPreferences.push ? "good" : "warn" },
                        ]}
                      />
                    </IntelligencePanel>
                  </div>

                  <IntelligencePanel title="Notes and recent operations" sub="Timeline, notes, approvals, and reminders">
                    <div className="space-y-2">
                      <div className="rounded-lg border border-white/8 bg-white/[0.02] p-3 text-sm text-slate-300">
                        {workspaceClient.notes || "No advisory notes available."}
                      </div>
                      {latestEvents.slice(0, 5).map((event) => (
                        <div key={event.id} className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 text-xs text-slate-300">
                          <span className="font-semibold text-white">{event.title}</span> · {event.detail}
                        </div>
                      ))}
                    </div>
                  </IntelligencePanel>
                </div>
              ) : null}

              {workspaceMode === "intelligence" ? (
                <div className="space-y-4">
                  <IntelligencePanel title="AI and market intelligence" sub="Concise, ranked signals with confidence scoring">
                    <div className="space-y-2">
                      {intelligenceSignals.map((signal) => (
                        <div key={signal.title} className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-white">{signal.title}</p>
                            <p className="text-[11px] text-slate-400">Priority {signal.priority} · Confidence {signal.confidence}</p>
                          </div>
                          <p className="mt-1 text-xs text-slate-300">{signal.signal}</p>
                        </div>
                      ))}
                    </div>
                  </IntelligencePanel>

                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <IntelligencePanel title="Advisory recommendations" sub="Opportunity engine and rebalance cues">
                      {aiAlerts.length === 0 ? (
                        <EmptyState title="No active recommendations" detail="No recommendation records were returned by intelligence services." />
                      ) : (
                        <div className="space-y-2">
                          {aiAlerts.slice(0, 8).map((alert, index) => (
                            <div key={`${index}-${typeof alert === "string" ? alert : alert.title}`} className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2 text-sm text-slate-200">
                              {typeof alert === "string" ? alert : alert.title}
                            </div>
                          ))}
                        </div>
                      )}
                    </IntelligencePanel>
                    <IntelligencePanel title="Macro and allocation context" sub="Regime, concentration, inactivity, and exposure">
                      <RiskPanel
                        items={[
                          { label: "Diversification analysis", value: `${workspaceClient.diversificationScore}/100`, tone: workspaceClient.diversificationScore >= 70 ? "good" : "warn" },
                          { label: "Concentration risk", value: workspaceClient.concentrationRisk, tone: workspaceClient.concentrationRisk.toLowerCase().includes("high") ? "bad" : "warn" },
                          { label: "Allocation imbalance", value: workspaceClient.equityExposurePct > 65 ? "Equity overweight" : "Balanced", tone: workspaceClient.equityExposurePct > 65 ? "warn" : "good" },
                          { label: "Sector/asset exposure", value: `Eq ${fmtPercent(valuation.exposurePct.stock)} · MF ${fmtPercent(valuation.exposurePct.mf)} · Cmd ${fmtPercent(valuation.exposurePct.commodity)}` },
                          { label: "Inactivity alerts", value: workspaceClient.activitySignal, tone: workspaceClient.activitySignal.toLowerCase().includes("inactive") ? "warn" : "good" },
                          { label: "Rebalance engine", value: workspaceClient.equityExposurePct > 65 ? "Action required" : "No trigger" },
                        ]}
                      />
                    </IntelligencePanel>
                  </div>
                </div>
              ) : null}

              <IntelligencePanel title="Asset actions" sub="Inline operating controls for holdings">
                {safeAssets.length === 0 ? (
                  <EmptyState
                    title="Portfolio not onboarded"
                    detail="Holdings have not been synced into this client workspace yet."
                    action={
                      <button
                        type="button"
                        disabled={inventoryMutation.isPending}
                        onClick={() => openInventoryEditor("create", null)}
                        className="rounded-lg bg-sky-400 px-4 py-2 text-sm font-semibold text-[#04102a] disabled:opacity-40"
                      >
                        Add Holding
                      </button>
                    }
                  />
                ) : (
                  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    {safeAssets.map((asset) => {
                      const holding = valuationMap[asset.id];
                      const source = livePricing.data?.[asset.id];
                      const cardHolding = toPortfolioHolding(asset, {
                        currentPrice: holding?.livePrice,
                        lastPriceUpdatedAt: typeof source?.asOf === "string" ? source.asOf : undefined,
                      });
                      return (
                        <AssetCard
                          key={asset.id}
                          asset={asset}
                          holding={cardHolding}
                          pricePoint={source}
                          onEdit={inventoryMutation.isPending ? undefined : () => openInventoryEditor("edit", asset)}
                          onDelete={inventoryMutation.isPending ? undefined : () => setAssetToDelete(asset)}
                        />
                      );
                    })}
                  </div>
                )}
              </IntelligencePanel>
            </div>
          </aside>
        }
      />

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
          onClose={() => {
            setPendingClientAction(null);
            setDeleteConfirmationInput("");
          }}
          onConfirm={() => void runClientAction()}
          pending={lifecycleMutation.isPending}
          tone={pendingClientAction.tone}
          requireTypedConfirmation={pendingClientAction.requireTypedConfirmation}
          confirmationInput={deleteConfirmationInput}
          onConfirmationInputChange={setDeleteConfirmationInput}
        />
      ) : null}

      {lifecycleSuccess ? (
        <div className="fixed bottom-4 right-4 z-[95] rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 shadow-2xl">
          {lifecycleSuccess}
        </div>
      ) : null}

      {assetError ? (
        <div className="fixed bottom-4 right-4 z-[95] rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200 shadow-2xl">
          {assetError}
        </div>
      ) : null}
    </>
  );
}
