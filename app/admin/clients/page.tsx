"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ClientDetailPanel } from "@/components/admin/ClientDetailPanel";
import { ActionMenu } from "@/components/admin/platform/ActionMenu";
import { AllocationRing } from "@/components/admin/platform/AllocationRing";
import { OperationalEmptyState } from "@/components/admin/platform/EmptyState";
import { IntelligenceWidget } from "@/components/admin/platform/IntelligenceWidget";
import { PlatformConfirmModal } from "@/components/admin/platform/PlatformModal";
import { StatusBadge } from "@/components/admin/platform/StatusBadge";
import { LoadingBlock, SectionHeader, SurfaceCard } from "@/components/v2/ui";
import { fmtCurrency, fmtPercent } from "@/lib/formatters";
import { ADMIN_CLIENTS_QUERY_KEY, useAdminClients, type EnrichedClient } from "@/lib/hooks/useAdminClients";
import {
  ALLOWED_TRANSITIONS,
  approveClient,
  archiveClient,
  deleteClient,
  restoreClient,
  suspendClient,
  updateClientStatus,
  type ClientOperationalStatus,
} from "@/lib/services/clientService";
import { toErrorMessage } from "@/lib/fetcher";

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

type StatusFilter =
  | "all"
  | "lead"
  | "onboarding"
  | "pending_kyc"
  | "approved"
  | "active"
  | "suspended"
  | "archived";

type ConfirmAction = {
  client: EnrichedClient;
  type: "status" | "archive" | "restore" | "approve" | "delete";
  nextStatus?: ClientOperationalStatus;
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "danger" | "primary";
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

function getPhoneHref(phone?: string) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  return digits ? `tel:${digits}` : undefined;
}

function getWhatsappHref(phone?: string, message?: string) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (!digits) return undefined;
  const base = `https://wa.me/${digits}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

function whatsappOnboardingMessage(name: string): string {
  return `Hi ${name},

Welcome to Asraa Wealth! 🎉

Your account has been approved and you now have full access to your personalised wealth management platform.

To get started:
1. Log in at https://wealth.asraa.in
2. Complete your portfolio onboarding
3. Review your AI-generated insights

Your dedicated advisor is here to guide you through the process.

We look forward to helping you grow your wealth.

— Asraa Wealth Team`;
}

function whatsappPortfolioReadyMessage(name: string): string {
  return `Hi ${name},

Your portfolio is now live on Asraa Wealth! 📊

Your holdings have been synced and your personalised wealth intelligence dashboard is ready.

Log in at https://wealth.asraa.in to view:
- Live portfolio valuation
- Asset allocation insights
- AI-powered recommendations

— Asraa Wealth Team`;
}

function whatsappPaymentReminderMessage(name: string): string {
  return `Hi ${name},

This is a friendly reminder from Asraa Wealth regarding an upcoming payment.

Please log in to your dashboard at https://wealth.asraa.in or contact your advisor to review the details.

— Asraa Wealth Team`;
}

function whatsappLeaseReminderMessage(name: string, propertyName?: string): string {
  const subject = propertyName ? `Your lease agreement for ${propertyName}` : "Your lease agreement";
  return `Hi ${name},

${subject} is approaching renewal.

Please log in to https://wealth.asraa.in to review your property details and schedule a discussion with your advisor.

— Asraa Wealth Team`;
}

function whatsappWelcomeMessage(name: string): string {
  return `Hi ${name},

Welcome to Asraa Wealth — your premium wealth management platform. ✨

We are delighted to have you onboard. Your advisor will reach out shortly to begin your wealth journey.

Get started: https://wealth.asraa.in

— Asraa Wealth Team`;
}

function whatsappRequestDocumentsMessage(name: string): string {
  return `Hi ${name},

As part of your onboarding with Asraa Wealth, we need a few documents to complete your KYC.

Please share the following at your earliest convenience:
- PAN card
- Aadhaar card
- Address proof
- Latest bank statement (last 3 months)

You can reply to this message or email your advisor directly.

— Asraa Wealth Team`;
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
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-7">
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [pendingAction, setPendingAction] = useState<ConfirmAction | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? null,
    [clients, selectedClientId]
  );

  useEffect(() => {
    if (selectedClientId == null && clients[0]) setSelectedClientId(clients[0].id);
    if (selectedClientId != null && !clients.some((client) => client.id === selectedClientId)) {
      setSelectedClientId(clients[0]?.id ?? null);
    }
  }, [clients, selectedClientId]);

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();
    return clients.filter((client) => {
      const matchesSearch =
        !query ||
        [
          client.name,
          client.email,
          client.phone,
          client.relationshipManager,
          client.leadSource,
          client.campaignSegmentation,
          client.tags.join(" "),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      const matchesStatus = statusFilter === "all" || client.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [clients, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / pageSize));
  const paginatedClients = filteredClients.slice((page - 1) * pageSize, page * pageSize);

  const propertyAssets = clients.flatMap((client) => client.assets.filter((asset) => asset.type === "property"));
  const occupiedProperties = propertyAssets.filter((asset) => Boolean(asset.tenantName ?? asset.tenant_name)).length;
  const dueSoonProperties = propertyAssets.filter((asset) => {
    if (!asset.rentDueDate && !asset.rent_due_date) return false;
    const due = new Date(String(asset.rentDueDate ?? asset.rent_due_date)).getTime();
    const diff = Math.ceil((due - Date.now()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 5;
  }).length;
  const overdueProperties = propertyAssets.filter((asset) => {
    if (!asset.rentDueDate && !asset.rent_due_date) return false;
    const due = new Date(String(asset.rentDueDate ?? asset.rent_due_date)).getTime();
    return due < Date.now();
  }).length;

  const widgetHeatmap = [...clients].sort((a, b) => b.totalNetWorth - a.totalNetWorth).slice(0, 5);
  const widgetRisk = [...clients].sort((a, b) => b.equityExposurePct - a.equityExposurePct).slice(0, 5);
  const widgetActivity = [...clients]
    .filter((client) => client.lastActivity)
    .sort((a, b) => new Date(String(b.lastActivity)).getTime() - new Date(String(a.lastActivity)).getTime())
    .slice(0, 5);
  const widgetApprovalQueue = clients.filter(
    (client) => ["lead", "onboarding", "pending_kyc", "approved"].includes(client.canonicalStatus)
  );

  async function runAction(action: ConfirmAction) {
    try {
      setActionLoadingId(action.client.id);
      setActionError(null);
      if (action.type === "status" && action.nextStatus) {
        if (action.nextStatus === "suspended") {
          await suspendClient(action.client.id);
        } else {
          await updateClientStatus(action.client.id, action.nextStatus, undefined, action.client.canonicalStatus);
        }
      }
      if (action.type === "archive") {
        await archiveClient(action.client.id);
      }
      if (action.type === "restore") {
        await restoreClient(action.client.id);
      }
      if (action.type === "approve") {
        await approveClient(action.client.id, undefined, action.client.canonicalStatus);
      }
      if (action.type === "delete") {
        await deleteClient(action.client.id);
      }
      await queryClient.invalidateQueries({ queryKey: ADMIN_CLIENTS_QUERY_KEY });
      setPendingAction(null);
      refresh();
    } catch (value) {
      setActionError(toErrorMessage(value));
    } finally {
      setActionLoadingId(null);
    }
  }

  function openStatusAction(client: EnrichedClient, nextStatus: ClientOperationalStatus) {
    const title = nextStatus === "active" ? "Activate Client" : "Suspend Client";
    const description =
      nextStatus === "active"
        ? "This will restore the client to live operational coverage."
        : "This will pause all operational access until the client is restored.";

    setPendingAction({
      client,
      type: "status",
      nextStatus,
      title,
      description,
      confirmLabel: nextStatus === "active" ? "Activate" : "Suspend",
      tone: nextStatus === "active" ? "primary" : "danger",
    });
  }

  const kpiTiles = [
    { label: "Total clients", value: String(kpis.totalClients), tone: "neutral" as const },
    { label: "Active", value: String(kpis.activeClients), tone: "success" as const },
    { label: "Onboarding", value: String(kpis.onboardingClients), tone: "warn" as const },
    { label: "Suspended", value: String(kpis.suspendedClients), tone: "danger" as const },
    { label: "Archived", value: String(kpis.archivedClients), tone: "danger" as const },
    { label: "Managed AUM", value: fmtCompact(kpis.totalAUM), tone: "info" as const },
    { label: "Property book", value: String(kpis.totalProperties), tone: "info" as const },
  ];

  return (
    <div className="space-y-5 text-white">
      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader
          eyebrow="Institutional client operations"
          title="Admin client workspace"
          subtitle="Operational intelligence, relationship oversight, portfolio risk, and real estate execution in one command layer"
          action={
            <Link href="/admin/clients/new" className="rounded-xl bg-sky-400 px-4 py-2 text-sm font-semibold text-[#04102a] transition hover:bg-sky-300">
              Add Client
            </Link>
          }
        />
      </SurfaceCard>

      <KpiStrip data={kpiTiles} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <IntelligenceWidget eyebrow="AUM heatmap" title="Top client concentration" detail="Largest capital clusters across live operational books.">
          <div className="space-y-3">
            {widgetHeatmap.length === 0 ? (
              <p className="text-sm text-slate-400">Portfolio not onboarded yet.</p>
            ) : (
              widgetHeatmap.map((client) => (
                <button key={client.id} type="button" onClick={() => setSelectedClientId(client.id)} className="block w-full rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3 text-left transition hover:border-sky-300/30 hover:bg-sky-500/[0.08]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{client.name}</p>
                      <p className="text-xs text-slate-400">{client.operationalFallback}</p>
                    </div>
                    <p className="text-xs font-semibold text-sky-200">{fmtCompact(client.totalNetWorth)}</p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-sky-400" style={{ width: `${kpis.totalAUM > 0 ? (client.totalNetWorth / kpis.totalAUM) * 100 : 0}%` }} />
                  </div>
                </button>
              ))
            )}
          </div>
        </IntelligenceWidget>

        <IntelligenceWidget eyebrow="Risk exposure" title="Equity and concentration watch" detail="Accounts breaching operating concentration thresholds.">
          <div className="space-y-3">
            {widgetRisk.map((client) => (
              <button key={client.id} type="button" onClick={() => setSelectedClientId(client.id)} className="flex w-full items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3 text-left transition hover:border-amber-300/30 hover:bg-amber-500/[0.08]">
                <div>
                  <p className="text-sm font-semibold text-white">{client.name}</p>
                  <p className="text-xs text-slate-400">{client.concentrationRisk}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-amber-100">{fmtPercent(client.equityExposurePct)}</p>
                  <p className="text-[11px] text-slate-400">Equity exposure</p>
                </div>
              </button>
            ))}
            {widgetRisk.length === 0 ? <p className="text-sm text-slate-400">Awaiting holdings sync.</p> : null}
          </div>
        </IntelligenceWidget>

        <IntelligenceWidget eyebrow="Rental pipeline" title="Real estate operations" detail="Occupancy, due-soon rent events, and portfolio rental pressure.">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-slate-400">Occupied</p><p className="mt-1 text-lg font-semibold text-white">{occupiedProperties}</p></div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-slate-400">Vacant / pipeline</p><p className="mt-1 text-lg font-semibold text-white">{Math.max(propertyAssets.length - occupiedProperties, 0)}</p></div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-slate-400">Rent due soon</p><p className="mt-1 text-lg font-semibold text-amber-100">{dueSoonProperties}</p></div>
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-slate-400">Overdue rent</p><p className="mt-1 text-lg font-semibold text-rose-100">{overdueProperties}</p></div>
          </div>
        </IntelligenceWidget>

        <IntelligenceWidget eyebrow="Live market movement" title="Portfolio health" detail="Derived live valuation and unrealized movement using the canonical valuation engine.">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-slate-400">Unrealized PnL</p><p className={`mt-1 text-lg font-semibold ${clients.reduce((sum, client) => sum + client.unrealizedPnL, 0) >= 0 ? "text-emerald-100" : "text-rose-100"}`}>{fmtCurrency(clients.reduce((sum, client) => sum + client.unrealizedPnL, 0))}</p></div>
              <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3"><p className="text-slate-400">Avg portfolio</p><p className="mt-1 text-lg font-semibold text-white">{fmtCompact(kpis.avgPortfolioValue)}</p></div>
            </div>
            <AllocationRing
              segments={[
                { label: "Equity", value: clients.reduce((sum, client) => sum + client.allocationMix.stock, 0) / Math.max(clients.length, 1), color: "#38bdf8" },
                { label: "Funds", value: clients.reduce((sum, client) => sum + client.allocationMix.mf, 0) / Math.max(clients.length, 1), color: "#818cf8" },
                { label: "Property", value: clients.reduce((sum, client) => sum + client.allocationMix.property, 0) / Math.max(clients.length, 1), color: "#34d399" },
                { label: "Commodity", value: clients.reduce((sum, client) => sum + client.allocationMix.commodity, 0) / Math.max(clients.length, 1), color: "#f59e0b" },
              ]}
              size={110}
            />
          </div>
        </IntelligenceWidget>

        <IntelligenceWidget eyebrow="Client activity feed" title="Latest relationship signals" detail="Operational touch points and engagement recency.">
          <div className="space-y-3">
            {widgetActivity.map((client) => (
              <button key={client.id} type="button" onClick={() => setSelectedClientId(client.id)} className="flex w-full items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3 text-left transition hover:border-sky-300/30 hover:bg-white/[0.06]">
                <div>
                  <p className="text-sm font-semibold text-white">{client.name}</p>
                  <p className="text-xs text-slate-400">{client.activitySignal}</p>
                </div>
                <p className="text-xs text-slate-300">{fmtDate(client.lastActivity)}</p>
              </button>
            ))}
            {widgetActivity.length === 0 ? <p className="text-sm text-slate-400">Awaiting first relationship signal.</p> : null}
          </div>
        </IntelligenceWidget>

        <IntelligenceWidget eyebrow="Approval queue" title="Onboarding and approval state" detail="Accounts requiring relationship or compliance progression.">
          <div className="space-y-3">
            {widgetApprovalQueue.slice(0, 5).map((client) => (
              <button key={client.id} type="button" onClick={() => setSelectedClientId(client.id)} className="flex w-full items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3 text-left transition hover:border-sky-300/30 hover:bg-white/[0.06]">
                <div>
                  <p className="text-sm font-semibold text-white">{client.name}</p>
                  <p className="text-xs text-slate-400">{client.onboardingStatus ?? "Awaiting onboarding progression"}</p>
                </div>
                <StatusBadge label={client.canonicalStatus} />
              </button>
            ))}
            {widgetApprovalQueue.length === 0 ? <p className="text-sm text-slate-400">Approval queue clear.</p> : null}
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

          <div className="flex items-center gap-2">
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

        <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
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
                  <th className="px-4 py-3">Portfolio</th>
                  <th className="px-4 py-3">Allocation</th>
                  <th className="px-4 py-3">Real estate</th>
                  <th className="px-4 py-3">AI intelligence</th>
                  <th className="px-4 py-3">Activity</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedClients.map((client) => (
                  <tr key={client.id} className="cursor-pointer border-t border-white/8 transition hover:bg-white/[0.04]" onClick={() => setSelectedClientId(client.id)}>
                    <td className="px-4 py-4 align-top">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-sky-400/20 bg-sky-500/10 text-sm font-semibold text-sky-100">
                          {client.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{client.name}</p>
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
                      <p className="text-sm text-white">{client.propertiesCount > 0 ? `${client.propertiesCount} properties` : "Property pipeline pending"}</p>
                      <p className="mt-1 text-xs text-slate-400">{client.propertiesCount > 0 ? `${client.occupiedProperties}/${client.propertiesCount} occupied · ${fmtCurrency(client.monthlyRentIncome)}/mo` : "No active rent pipeline"}</p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <p className="text-sm text-white">{client.diversificationScore}/100 diversification</p>
                      <p className="mt-1 text-xs text-slate-400">{client.concentrationRisk}</p>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <p className="text-sm text-white">{fmtDate(client.lastActivity)}</p>
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
                             { label: "View Intelligence", onSelect: () => setSelectedClientId(client.id) },
                             { label: "Edit Client", href: `/admin/clients/${client.id}/edit` },
                             { label: "WhatsApp", href: getWhatsappHref(client.whatsapp ?? client.phone), disabled: !getWhatsappHref(client.whatsapp ?? client.phone) },
                             { label: "Approve & WhatsApp", href: getWhatsappHref(client.whatsapp ?? client.phone, whatsappOnboardingMessage(client.name)), disabled: !getWhatsappHref(client.whatsapp ?? client.phone) },
                             { label: "Send Welcome", href: getWhatsappHref(client.whatsapp ?? client.phone, whatsappWelcomeMessage(client.name)), disabled: !getWhatsappHref(client.whatsapp ?? client.phone) },
                             { label: "Request Documents", href: getWhatsappHref(client.whatsapp ?? client.phone, whatsappRequestDocumentsMessage(client.name)), disabled: !getWhatsappHref(client.whatsapp ?? client.phone) },
                             { label: "Share Portfolio Summary", href: getWhatsappHref(client.whatsapp ?? client.phone, whatsappPortfolioReadyMessage(client.name)), disabled: !getWhatsappHref(client.whatsapp ?? client.phone) },
                             { label: "Lease Reminder", href: getWhatsappHref(client.whatsapp ?? client.phone, whatsappLeaseReminderMessage(client.name)), disabled: !getWhatsappHref(client.whatsapp ?? client.phone) },
                             { label: "Payment Reminder", href: getWhatsappHref(client.whatsapp ?? client.phone, whatsappPaymentReminderMessage(client.name)), disabled: !getWhatsappHref(client.whatsapp ?? client.phone) },
                             { label: "Call", href: getPhoneHref(client.phone), disabled: !getPhoneHref(client.phone) },
                             { label: "Email", href: client.email ? `mailto:${client.email}` : undefined, disabled: !client.email },
                             { label: "Schedule Meeting", href: client.email ? `mailto:${client.email}?subject=${encodeURIComponent(`Meeting schedule - ${client.name}`)}` : undefined, disabled: !client.email },
                             { label: "Send Report", href: client.email ? `mailto:${client.email}?subject=${encodeURIComponent(`Portfolio report - ${client.name}`)}` : undefined, disabled: !client.email },
                              { label: "Approve", onSelect: () => setPendingAction({ client, type: "approve", title: "Approve Client", description: "Approve this client for live onboarding and advisory operations.", confirmLabel: "Approve", tone: "primary" }), disabled: !ALLOWED_TRANSITIONS[client.canonicalStatus].includes("approved") },
                              { label: "Activate", onSelect: () => openStatusAction(client, "active"), disabled: !ALLOWED_TRANSITIONS[client.canonicalStatus].includes("active") },
                              { label: "Suspend", onSelect: () => openStatusAction(client, "suspended"), disabled: !ALLOWED_TRANSITIONS[client.canonicalStatus].includes("suspended") },
                              { label: "Restore", onSelect: () => setPendingAction({ client, type: "restore", title: "Restore Client", description: "This client will return to the active operational roster.", confirmLabel: "Restore", tone: "primary" }), disabled: client.canonicalStatus !== "archived" },
                              { label: "Archive", onSelect: () => setPendingAction({ client, type: "archive", title: "Archive Client", description: "This client will be removed from active operations but can be restored later.", confirmLabel: "Archive Client" }), disabled: !ALLOWED_TRANSITIONS[client.canonicalStatus].includes("archived") },
                             { label: "Delete", onSelect: () => setPendingAction({ client, type: "delete", title: "Delete Client", description: "This permanently deletes the client workspace and cannot be undone.", confirmLabel: "Delete Client", tone: "danger" }), tone: "danger" },
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

        <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
          <p>Page {page} / {totalPages}</p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1} className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 disabled:opacity-40">Previous</button>
            <button type="button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page === totalPages} className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 disabled:opacity-40">Next</button>
          </div>
        </div>
      </SurfaceCard>

      <ClientDetailPanel client={selectedClient} onClose={() => setSelectedClientId(null)} onRefresh={refresh} />

      {pendingAction ? (
        <PlatformConfirmModal
          title={pendingAction.title}
          description={pendingAction.description}
          confirmLabel={pendingAction.confirmLabel}
          onClose={() => setPendingAction(null)}
          onConfirm={() => void runAction(pendingAction)}
          pending={actionLoadingId === pendingAction.client.id}
          tone={pendingAction.tone}
        />
      ) : null}
    </div>
  );
}
