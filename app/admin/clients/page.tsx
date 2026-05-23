"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ActionMenu } from "@/components/admin/platform/ActionMenu";
import { OperationalEmptyState } from "@/components/admin/platform/EmptyState";
import { IntelligenceWidget } from "@/components/admin/platform/IntelligenceWidget";
import { PlatformConfirmModal } from "@/components/admin/platform/PlatformModal";
import { StatusBadge } from "@/components/admin/platform/StatusBadge";
import { LoadingBlock, SectionHeader, SurfaceCard } from "@/components/v2/ui";
import { fmtCurrency, fmtPercent } from "@/lib/formatters";
import { ADMIN_CLIENTS_QUERY_KEY, useAdminClients, type EnrichedClient } from "@/lib/hooks/useAdminClients";
import { adminQueryKeys } from "@/lib/queryKeys/admin";
import { useAdminWorkspaceState } from "@/domains/admin";
import { ALLOWED_TRANSITIONS } from "@/lib/services/clientService";
import { toLifecycleErrorMessage } from "@/lib/services/clientLifecycleErrors";
import { useAdminClientLifecycleMutation } from "@/domains/admin";

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
const DEFAULT_WORKSPACE_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];
const VIRTUAL_ROW_STYLE = { contentVisibility: "auto", containIntrinsicSize: "96px" } as const;

const ClientDetailPanel = dynamic(
  () => import("@/components/admin/ClientDetailPanel").then((mod) => mod.ClientDetailPanel),
  {
    ssr: false,
    loading: () => <LoadingBlock label="Loading client details..." />,
  }
);

type ConfirmAction = {
  client: EnrichedClient;
  type: "archive" | "restore" | "delete";
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "danger" | "primary";
  requireTypedConfirmation?: string;
};

function fmtCompact(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

function fmtDate(iso?: string): string {
  if (!iso) return "Awaiting signal";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function AllocationMiniBar({ client }: { client: EnrichedClient }) {
  const total = client.assets.length;
  if (total === 0 || client.totalNetWorth <= 0) {
    return <span className="text-xs text-slate-400">{client.operationalFallback}</span>;
  }

  return (
    <div className="space-y-2">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-white/5">
        {[
          { value: client.allocationMix.stock, color: "#38bdf8" },
          { value: client.allocationMix.mf, color: "#818cf8" },
          { value: client.allocationMix.property, color: "#34d399" },
          { value: client.allocationMix.commodity, color: "#f59e0b" },
        ]
          .filter((segment) => segment.value > 0)
          .map((segment) => (
            <div key={`${segment.color}-${segment.value}`} style={{ width: `${segment.value}%`, background: segment.color }} />
          ))}
      </div>
      <p className="text-[11px] text-slate-400">
        Eq {client.allocationMix.stock.toFixed(0)}% · MF {client.allocationMix.mf.toFixed(0)}% · Re {client.allocationMix.property.toFixed(0)}% · Cmd {client.allocationMix.commodity.toFixed(0)}%
      </p>
    </div>
  );
}

function KpiStrip({
  data,
}: {
  data: Array<{ label: string; value: string; tone: "info" | "success" | "warn" | "danger" | "neutral" }>;
}) {
  const tones: Record<string, string> = {
    info: "border-sky-400/20 bg-sky-500/10 text-sky-100",
    success: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
    warn: "border-amber-400/20 bg-amber-500/10 text-amber-100",
    danger: "border-rose-400/20 bg-rose-500/10 text-rose-100",
    neutral: "border-white/10 bg-white/[0.04] text-slate-100",
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 xl:grid-cols-7">
      {data.map((tile) => (
        <div key={tile.label} className={`rounded-[1.25rem] border p-4 ${tones[tile.tone]}`}>
          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-300/70">{tile.label}</p>
          <p className="mt-2 text-xl font-semibold text-white">{tile.value}</p>
        </div>
      ))}
    </div>
  );
}

export default function ClientsPage() {
  const { clients, kpis, loading, error, refresh } = useAdminClients();
  const queryClient = useQueryClient();
  const {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    pageSize,
    setPageSize,
    filteredClients,
    paginatedClients,
    totalPages,
  } = useAdminWorkspaceState(clients, { pageSize: DEFAULT_WORKSPACE_PAGE_SIZE });
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedClientMode, setSelectedClientMode] = useState<"overview" | "portfolio" | "operations" | "intelligence">("overview");
  const [pendingAction, setPendingAction] = useState<ConfirmAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const lifecycleMutation = useAdminClientLifecycleMutation(pendingAction?.client.id ?? null);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? null,
    [clients, selectedClientId]
  );

  useEffect(() => {
    if (!actionSuccess) return;
    const handle = window.setTimeout(() => setActionSuccess(null), 3000);
    return () => window.clearTimeout(handle);
  }, [actionSuccess]);

  useEffect(() => {
    // Only clear selection if the selected client was removed from the list (e.g. deleted).
    // Do NOT auto-select clients[0] when selectedClientId is null — that would re-open
    // the panel immediately after the user closes it.
    if (selectedClientId != null && !clients.some((client) => client.id === selectedClientId)) {
      if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
        console.info("[workspace-close]", { event: "workspace.close.client-removed", clientId: selectedClientId });
      }
      setSelectedClientId(null);
    }
  }, [clients, selectedClientId]);
  const lifecycleWidget = useMemo(() => {
    return {
      active: clients.filter((client) => client.canonicalStatus === "active").length,
      archived: clients.filter((client) => client.canonicalStatus === "archived").length,
      lead: clients.filter((client) => client.canonicalStatus === "lead").length,
      suspended: clients.filter((client) => client.canonicalStatus === "suspended").length,
      actionable: clients.filter((client) => ["lead", "suspended", "archived"].includes(client.canonicalStatus)).slice(0, 5),
    };
  }, [clients]);
  const runtimeWidget = useMemo(() => {
    const connected = clients.filter((client) => client.totalNetWorth > 0).length;
    const latest = [...clients]
      .filter((client) => client.lastActivity)
      .sort((a, b) => new Date(String(b.lastActivity)).getTime() - new Date(String(a.lastActivity)).getTime())
      .slice(0, 5);
    return { connected, latest };
  }, [clients]);
  const allocationWidget = useMemo(() => {
    const count = Math.max(clients.length, 1);
    return {
      stock: clients.reduce((sum, client) => sum + client.allocationMix.stock, 0) / count,
      mf: clients.reduce((sum, client) => sum + client.allocationMix.mf, 0) / count,
      property: clients.reduce((sum, client) => sum + client.allocationMix.property, 0) / count,
      commodity: clients.reduce((sum, client) => sum + client.allocationMix.commodity, 0) / count,
      top: [...clients].sort((a, b) => b.totalNetWorth - a.totalNetWorth).slice(0, 5),
    };
  }, [clients]);
  const intelligenceWidget = useMemo(() => {
    return {
      highRisk: clients.filter((client) => client.concentrationRisk.toLowerCase().includes("high")).length,
      archived: clients.filter((client) => client.canonicalStatus === "archived").slice(0, 5),
      topRisk: [...clients].sort((a, b) => b.equityExposurePct - a.equityExposurePct).slice(0, 5),
    };
  }, [clients]);

  async function runAction(action: ConfirmAction) {
    try {
      setActionLoadingId(action.client.id);
      setActionError(null);
      setActionSuccess(null);
      if (action.type === "delete" && action.client.canonicalStatus !== "archived") {
        throw new Error("Permanent delete is only available for archived clients.");
      }
      if (action.type === "archive") {
        await lifecycleMutation.mutateAsync({ action: "archive", currentStatus: action.client.canonicalStatus });
      }
      if (action.type === "restore") {
        await lifecycleMutation.mutateAsync({ action: "restore", currentStatus: action.client.canonicalStatus });
      }
      if (action.type === "delete") {
        await lifecycleMutation.mutateAsync({ action: "delete", currentStatus: action.client.canonicalStatus });
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ADMIN_CLIENTS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.clientDetail(action.client.id) }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.clientProfile(action.client.id) }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.clientAssetPricing(action.client.id) }),
      ]);
      setActionSuccess(
        action.type === "restore"
          ? "Client restored successfully"
          : action.type === "delete"
            ? "Client permanently deleted"
            : "Client action completed successfully"
      );
      setDeleteConfirmationInput("");
      setPendingAction(null);
    } catch (value) {
      setActionError(toLifecycleErrorMessage(value, action.type));
    } finally {
      setActionLoadingId(null);
    }
  }

  function openClient(clientId: number, mode: "overview" | "portfolio" | "operations" | "intelligence" = "overview") {
    setSelectedClientMode(mode);
    setSelectedClientId(clientId);
  }

  const kpiTiles = useMemo(() => [
    { label: "Total clients", value: String(kpis.totalClients), tone: "neutral" as const },
    { label: "Active", value: String(kpis.activeClients), tone: "success" as const },
    { label: "Onboarding", value: String(kpis.onboardingClients), tone: "warn" as const },
    { label: "Suspended", value: String(kpis.suspendedClients), tone: "danger" as const },
    { label: "Archived", value: String(kpis.archivedClients), tone: "danger" as const },
    { label: "Managed AUM", value: fmtCompact(kpis.totalAUM), tone: "info" as const },
    { label: "Avg portfolio", value: fmtCompact(kpis.avgPortfolioValue), tone: "info" as const },
  ], [kpis]);

  const closeClientWorkspace = useCallback(() => {
    if (selectedClientId != null) {
      // Cancel any in-flight requests for this client.
      void queryClient.cancelQueries({ queryKey: adminQueryKeys.clientDetail(selectedClientId) });
      void queryClient.cancelQueries({ queryKey: adminQueryKeys.clientAssetPricing(selectedClientId) });
      // Remove cached results so the next open always starts with a clean slate
      // and never carries over stale degraded / error state.
      void queryClient.removeQueries({ queryKey: adminQueryKeys.clientDetail(selectedClientId) });
      void queryClient.removeQueries({ queryKey: adminQueryKeys.clientProfile(selectedClientId) });
      void queryClient.removeQueries({
        predicate: (query) => {
          const [scope, entity, id, slice] = query.queryKey as Array<string | number>;
          return scope === "admin" && entity === "clients" && id === selectedClientId && slice === "asset-pricing";
        },
      });
    }
    if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
      console.info("[workspace-close]", { event: "workspace.close", clientId: selectedClientId ?? null });
    }
    setSelectedClientId(null);
    setSelectedClientMode("overview");
  }, [queryClient, selectedClientId]);

  return (
    <div className="space-y-5 text-white">
      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader
          eyebrow="Institutional client operations"
          title="Admin client workspace"
          subtitle="Canonical client command center for lifecycle, runtime portfolio state, allocation, and AI intelligence"
          action={
            <Link href="/admin/clients/new" className="rounded-xl bg-sky-400 px-4 py-2 text-sm font-semibold text-[#04102a] transition hover:bg-sky-300">
              Add Client
            </Link>
          }
        />
      </SurfaceCard>

      <KpiStrip data={kpiTiles} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <IntelligenceWidget eyebrow="Client lifecycle" title="Lifecycle command" detail="Primary lifecycle states and actionable queues.">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-slate-400">Active</p><p className="mt-1 text-lg font-semibold text-emerald-100">{lifecycleWidget.active}</p></div>
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-slate-400">Archived</p><p className="mt-1 text-lg font-semibold text-rose-100">{lifecycleWidget.archived}</p></div>
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-slate-400">Leads</p><p className="mt-1 text-lg font-semibold text-amber-100">{lifecycleWidget.lead}</p></div>
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-slate-400">Suspended</p><p className="mt-1 text-lg font-semibold text-amber-100">{lifecycleWidget.suspended}</p></div>
            </div>
            {lifecycleWidget.actionable.map((client) => (
              <button key={client.id} type="button" onClick={() => openClient(client.id, "operations")} className="flex w-full items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-left transition hover:border-sky-300/30 hover:bg-white/[0.06]">
                <div>
                  <p className="text-sm font-semibold text-white">{client.name}</p>
                  <p className="text-xs text-slate-400">Lifecycle action required</p>
                </div>
                <StatusBadge label={client.canonicalStatus} />
              </button>
            ))}
          </div>
        </IntelligenceWidget>

        <IntelligenceWidget eyebrow="Portfolio runtime" title="Runtime coverage" detail="Live portfolio runtime status and latest activity streams.">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-slate-400">Runtime connected</p><p className="mt-1 text-lg font-semibold text-emerald-100">{runtimeWidget.connected}</p></div>
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-slate-400">Managed AUM</p><p className="mt-1 text-lg font-semibold text-white">{fmtCompact(kpis.totalAUM)}</p></div>
            </div>
            {runtimeWidget.latest.map((client) => (
                <button key={client.id} type="button" onClick={() => openClient(client.id, "portfolio")} className="flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3 text-left transition hover:border-sky-300/30 hover:bg-sky-500/[0.08]">
                <div>
                  <p className="text-sm font-semibold text-white">{client.name}</p>
                  <p className="text-xs text-slate-400">{client.activitySignal}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-sky-100">{fmtDate(client.lastActivity)}</p>
                  <p className="text-[11px] text-slate-400">Last runtime event</p>
                </div>
              </button>
            ))}
            {runtimeWidget.latest.length === 0 ? <p className="text-sm text-slate-400">Awaiting holdings sync.</p> : null}
          </div>
        </IntelligenceWidget>

        <IntelligenceWidget eyebrow="Asset allocation" title="Allocation command" detail="Cross-book allocation distribution and concentration leaders.">
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-slate-400">Stocks</p><p className="mt-1 text-lg font-semibold text-sky-100">{allocationWidget.stock.toFixed(0)}%</p></div>
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-slate-400">Mutual funds</p><p className="mt-1 text-lg font-semibold text-indigo-100">{allocationWidget.mf.toFixed(0)}%</p></div>
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-slate-400">Property</p><p className="mt-1 text-lg font-semibold text-emerald-100">{allocationWidget.property.toFixed(0)}%</p></div>
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-slate-400">Commodity</p><p className="mt-1 text-lg font-semibold text-amber-100">{allocationWidget.commodity.toFixed(0)}%</p></div>
            </div>
            {allocationWidget.top.map((client) => (
              <button key={client.id} type="button" onClick={() => openClient(client.id, "portfolio")} className="flex w-full items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-left transition hover:border-sky-300/30 hover:bg-white/[0.06]">
                <div>
                  <p className="text-sm font-semibold text-white">{client.name}</p>
                  <p className="text-xs text-slate-400">{client.operationalFallback}</p>
                </div>
                <p className="text-xs font-semibold text-sky-200">{fmtCompact(client.totalNetWorth)}</p>
              </button>
            ))}
          </div>
        </IntelligenceWidget>

        <IntelligenceWidget eyebrow="AI intelligence" title="Risk & recommendations" detail="AI risk markers and archived-state intelligence coverage.">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-slate-400">High risk profiles</p><p className="mt-1 text-lg font-semibold text-rose-100">{intelligenceWidget.highRisk}</p></div>
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-slate-400">Archived requiring action</p><p className="mt-1 text-lg font-semibold text-amber-100">{intelligenceWidget.archived.length}</p></div>
            </div>
            {intelligenceWidget.topRisk.map((client) => (
              <button key={client.id} type="button" onClick={() => openClient(client.id, "intelligence")} className="flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3 text-left transition hover:border-sky-300/30 hover:bg-white/[0.06]">
                <div>
                  <p className="text-sm font-semibold text-white">{client.name}</p>
                  <p className="text-xs text-slate-400">{client.concentrationRisk}</p>
                </div>
                <p className="text-xs text-slate-300">Equity {fmtPercent(client.equityExposurePct)}</p>
              </button>
            ))}
            {intelligenceWidget.topRisk.length === 0 ? <p className="text-sm text-slate-400">No elevated risk signals.</p> : null}
          </div>
        </IntelligenceWidget>
      </div>

      <SurfaceCard className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search by client, coverage owner, source, or tag"
              className="w-full max-w-md rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition focus:border-sky-300/40 focus:bg-sky-500/[0.08]"
            />
            <div className="flex flex-wrap items-center gap-2">
              {(["all", "lead", "onboarding", "pending_kyc", "approved", "active", "suspended", "archived"] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => {
                    setStatusFilter(filter);
                    setPage(1);
                  }}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition ${statusFilter === filter ? "border-sky-300/30 bg-sky-500/10 text-sky-100" : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"}`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="flex w-full sm:w-auto items-center gap-2">
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value) as (typeof PAGE_SIZE_OPTIONS)[number]);
                setPage(1);
              }}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option} / page</option>
              ))}
            </select>
            <button type="button" onClick={refresh} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10">
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-400">
          <p>{loading ? "Loading client command table…" : `${filteredClients.length} client command rows`}</p>
          <p>{actionError ? <span className="text-rose-300">{actionError}</span> : "Operational actions route through /api/v2 client endpoints"}</p>
        </div>

        {error ? (
          <div className="mt-4 rounded-[1.25rem] border border-rose-400/20 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>
        ) : loading ? (
          <LoadingBlock label="Loading client operations table…" />
        ) : paginatedClients.length === 0 ? (
          <div className="mt-4">
            <OperationalEmptyState
              title="No institutional client rows available"
              description={search || statusFilter !== "all" ? "Adjust filters to reopen the command table." : "Create the first client workspace to begin operational coverage."}
              hint={search || statusFilter !== "all" ? "Filter intelligence" : "Onboarding command"}
              action={<Link href="/admin/clients/new" className="rounded-xl bg-sky-400 px-4 py-2 text-sm font-semibold text-[#04102a]">Create client workspace</Link>}
            />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-[1.25rem] border border-white/8">
            <table className="min-w-full text-left">
              <thead className="bg-white/[0.03] text-[11px] uppercase tracking-[0.16em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Relationship</th>
                  <th className="px-4 py-3">Portfolio Runtime</th>
                  <th className="px-4 py-3">Asset Allocation</th>
                  <th className="px-4 py-3">AI Intelligence</th>
                  <th className="px-4 py-3">Lifecycle</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedClients.map((client) => (
                    <tr key={client.id} className="cursor-pointer border-t border-white/8 transition hover:bg-white/[0.04]" onClick={() => openClient(client.id)} style={VIRTUAL_ROW_STYLE}>
                    <td className="px-4 py-4 align-top">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-500/10 text-sm font-semibold text-sky-100">
                          {client.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-white">{client.name}</p>
                            {client.canonicalStatus === "archived" ? <StatusBadge label={client.canonicalStatus} tone="danger" /> : null}
                          </div>
                          <p className="text-xs text-slate-400">{client.email}</p>
                          <p className="mt-2 text-[11px] text-slate-500">{client.phone || "Call channel pending"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <p className="text-sm text-white">{client.relationshipManager || "Coverage owner unassigned"}</p>
                      <p className="mt-1 text-xs text-slate-400">{client.leadSource || "Lead source awaiting capture"}</p>
                      <p className="mt-2 text-[11px] text-sky-200/80">{client.tags.length > 0 ? client.tags.join(" · ") : "Segmentation pending"}</p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <p className="text-sm font-semibold text-white">{client.totalNetWorth > 0 ? fmtCurrency(client.totalNetWorth) : client.operationalFallback}</p>
                      <p className={`mt-1 text-xs ${client.unrealizedPnL >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{client.totalNetWorth > 0 ? `${fmtPercent(client.unrealizedPnLPct, true)} unrealized` : client.activitySignal}</p>
                    </td>
                    <td className="px-4 py-4 align-top"><AllocationMiniBar client={client} /></td>
                    <td className="px-4 py-4 align-top">
                      <p className="text-sm text-white">{client.diversificationScore}/100 diversification</p>
                      <p className="mt-1 text-xs text-slate-400">{client.concentrationRisk}</p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <p className="text-sm text-white">{client.canonicalStatus === "archived" ? "Archived" : client.canonicalStatus === "suspended" ? "Suspended" : "Operational"}</p>
                      <p className="mt-1 text-xs text-slate-400">{client.activitySignal}</p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <div className="space-y-2">
                        <StatusBadge label={client.canonicalStatus} />
                      </div>
                    </td>
                    <td className="px-4 py-4 align-top text-right">
                      <div className="flex justify-end">
                        <ActionMenu
                          items={[
                            { label: "View", onSelect: () => openClient(client.id, "overview") },
                            { label: "Operate", onSelect: () => openClient(client.id, "operations") },
                            {
                              label: "Archive",
                              onSelect: () =>
                                setPendingAction({
                                  client,
                                  type: "archive",
                                  title: "Archive Client",
                                  description: "Archive this client workspace from active books.",
                                  confirmLabel: "Archive Client",
                                  tone: "danger",
                                }),
                              disabled: !(ALLOWED_TRANSITIONS[client.canonicalStatus] ?? []).includes("archived"),
                            },
                            {
                              label: "Restore",
                              onSelect: () =>
                                setPendingAction({
                                  client,
                                  type: "restore",
                                  title: "Restore Client",
                                  description: "Restore this client back to active operational coverage.",
                                  confirmLabel: "Restore",
                                  tone: "primary",
                                }),
                              disabled: client.canonicalStatus !== "archived",
                            },
                            ...(client.canonicalStatus === "archived"
                              ? [
                                  {
                                    label: "Delete Permanently",
                                    onSelect: () =>
                                      setPendingAction({
                                        client,
                                        type: "delete",
                                        title: "Delete Client Permanently",
                                        description: "This permanently deletes the archived client and all runtime projections. This action cannot be undone.",
                                        confirmLabel: "Delete Permanently",
                                        tone: "danger" as const,
                                        requireTypedConfirmation: "DELETE",
                                      }),
                                    tone: "danger" as const,
                                  },
                                ]
                              : []),
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-400">
          <p>Page {page} / {totalPages}</p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1} className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 disabled:opacity-40">Previous</button>
            <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page === totalPages} className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 disabled:opacity-40">Next</button>
          </div>
        </div>
      </SurfaceCard>

      {selectedClient ? (
        <ClientDetailPanel
          client={selectedClient}
          onClose={closeClientWorkspace}
          initialMode={selectedClientMode}
          onLifecycleSuccess={setActionSuccess}
        />
      ) : null}

      {pendingAction ? (
        <PlatformConfirmModal
          title={pendingAction.title}
          description={pendingAction.description}
          confirmLabel={pendingAction.confirmLabel}
          onClose={() => {
            setPendingAction(null);
            setDeleteConfirmationInput("");
          }}
          onConfirm={() => void runAction(pendingAction)}
          pending={actionLoadingId === pendingAction.client.id || lifecycleMutation.isPending}
          tone={pendingAction.tone}
          requireTypedConfirmation={pendingAction.requireTypedConfirmation}
          confirmationInput={deleteConfirmationInput}
          onConfirmationInputChange={setDeleteConfirmationInput}
        />
      ) : null}

      {actionSuccess ? (
        <div className="fixed bottom-4 right-4 z-[95] rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 shadow-2xl">
          {actionSuccess}
        </div>
      ) : null}
    </div>
  );
}
