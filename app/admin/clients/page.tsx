"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useAdminClients } from "@/lib/hooks/useAdminClients";
import type { EnrichedClient } from "@/lib/hooks/useAdminClients";
import { ClientDetailPanel } from "@/components/admin/ClientDetailPanel";
import { SurfaceCard, SectionHeader, StatusPill, LoadingBlock } from "@/components/v2/ui";
import { fmtCurrency, fmtPercent } from "@/lib/formatters";

// ── Helpers ────────────────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

function fmtCompact(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

function fmtDate(iso?: string): string {
  if (!iso) return "—";
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

function AllocationMiniBar({
  mix,
}: {
  mix: { stock: number; mf: number; property: number };
}) {
  const total = mix.stock + mix.mf + mix.property;
  if (total === 0)
    return <span className="text-slate-600 text-[11px]">No assets</span>;
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex rounded-full overflow-hidden h-1.5 w-20">
        {mix.stock > 0 && (
          <div style={{ width: `${mix.stock}%`, background: "#38bdf8" }} />
        )}
        {mix.mf > 0 && (
          <div style={{ width: `${mix.mf}%`, background: "#818cf8" }} />
        )}
        {mix.property > 0 && (
          <div style={{ width: `${mix.property}%`, background: "#34d399" }} />
        )}
      </div>
      <span className="text-[10px] text-slate-400 whitespace-nowrap">
        {mix.stock > 0 ? `E${mix.stock.toFixed(0)}%` : ""}
        {mix.mf > 0 ? ` F${mix.mf.toFixed(0)}%` : ""}
        {mix.property > 0 ? ` R${mix.property.toFixed(0)}%` : ""}
      </span>
    </div>
  );
}

type SortKey = keyof EnrichedClient | "";
type SortDir = "asc" | "desc";

// ── KPI Strip ──────────────────────────────────────────────────────────────

function KpiStrip({
  kpis,
  loading,
}: {
  kpis: {
    totalClients: number;
    activeClients: number;
    inactiveClients: number;
    totalAUM: number;
    totalProperties: number;
    avgPortfolioValue: number;
  };
  loading: boolean;
}) {
  const tiles = [
    {
      label: "Total Clients",
      value: loading ? "—" : String(kpis.totalClients),
      tone: "info" as const,
    },
    {
      label: "Active Accounts",
      value: loading ? "—" : String(kpis.activeClients),
      tone: "success" as const,
    },
    {
      label: "Inactive Accounts",
      value: loading ? "—" : String(kpis.inactiveClients),
      tone: kpis.inactiveClients > 0 ? ("warn" as const) : ("success" as const),
    },
    {
      label: "Total Managed AUM",
      value: loading ? "—" : fmtCompact(kpis.totalAUM),
      tone: "info" as const,
    },
    {
      label: "Managed Properties",
      value: loading ? "—" : String(kpis.totalProperties),
      tone: "info" as const,
    },
    {
      label: "Avg Portfolio",
      value: loading ? "—" : fmtCompact(kpis.avgPortfolioValue),
      tone: "info" as const,
    },
  ];

  const toneStyle: Record<string, { bg: string; text: string; border: string }> = {
    info: {
      bg: "rgba(56,189,248,0.07)",
      text: "#38bdf8",
      border: "rgba(56,189,248,0.2)",
    },
    success: {
      bg: "rgba(52,211,153,0.07)",
      text: "#34d399",
      border: "rgba(52,211,153,0.2)",
    },
    warn: {
      bg: "rgba(251,191,36,0.07)",
      text: "#fbbf24",
      border: "rgba(251,191,36,0.2)",
    },
    danger: {
      bg: "rgba(239,68,68,0.07)",
      text: "#f87171",
      border: "rgba(239,68,68,0.2)",
    },
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
      {tiles.map(({ label, value, tone }) => {
        const s = toneStyle[tone];
        return (
          <div
            key={label}
            className="rounded-xl p-4"
            style={{
              background: s.bg,
              border: `1px solid ${s.border}`,
            }}
          >
            <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">
              {label}
            </p>
            <p
              className="text-xl font-extrabold mt-1.5 leading-none"
              style={{ color: s.text }}
            >
              {value}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ── Column header ──────────────────────────────────────────────────────────

function TH({
  label,
  sortKey,
  currentSort,
  currentDir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  currentDir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  const active = sortKey !== "" && currentSort === sortKey;
  return (
    <th
      className="px-3 py-3 text-left text-[10px] uppercase tracking-[0.14em] font-semibold text-slate-400 whitespace-nowrap select-none"
      style={{ cursor: sortKey ? "pointer" : "default" }}
      onClick={() => sortKey && onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey && (
          <span
            className={`transition-opacity ${active ? "opacity-100" : "opacity-30"}`}
          >
            {active && currentDir === "desc" ? "↓" : "↑"}
          </span>
        )}
      </span>
    </th>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function ClientsPage() {
  const { clients, kpis, loading, error, refresh } = useAdminClients();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(10);
  const [selectedClient, setSelectedClient] = useState<EnrichedClient | null>(null);

  const handleSort = useCallback(
    (key: SortKey) => {
      if (sortKey === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDir("asc");
      }
      setPage(1);
    },
    [sortKey]
  );

  const filtered = useMemo(() => {
    let result = clients;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone?.includes(q)
      );
    }

    if (statusFilter === "active") result = result.filter((c) => c.isActive);
    if (statusFilter === "inactive") result = result.filter((c) => !c.isActive);

    if (sortKey) {
      result = [...result].sort((a, b) => {
        const av = a[sortKey as keyof EnrichedClient] ?? "";
        const bv = b[sortKey as keyof EnrichedClient] ?? "";
        let cmp = 0;
        if (typeof av === "number" && typeof bv === "number") {
          cmp = av - bv;
        } else {
          cmp = String(av).localeCompare(String(bv));
        }
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [clients, search, statusFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const commonTHProps = { currentSort: sortKey, currentDir: sortDir, onSort: handleSort };

  return (
    <div className="space-y-5 text-white">
      {/* Header */}
      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader
          eyebrow="Client Operations Intelligence"
          title="Clients workspace"
          subtitle="Institutional client management, portfolio intelligence, and operational oversight"
          action={
            <Link
              href="/admin/clients/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-black"
              style={{
                background: "linear-gradient(90deg, #38bdf8, #7dd3fc)",
                boxShadow: "0 2px 8px rgba(56,189,248,0.25)",
              }}
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Client
            </Link>
          }
        />
      </SurfaceCard>

      {/* KPI Strip */}
      <KpiStrip kpis={kpis} loading={loading} />

      {/* Operations Table */}
      <SurfaceCard className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-sky-300/50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search clients…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="v2-input pl-8 w-full"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1.5">
            {(["all", "active", "inactive"] as const).map((f) => (
              <button
                key={f}
                onClick={() => {
                  setStatusFilter(f);
                  setPage(1);
                }}
                className={`v2-action capitalize ${statusFilter === f ? "v2-filter-active" : ""}`}
              >
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Page size */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value) as typeof pageSize);
              setPage(1);
            }}
            className="v2-select"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>

          {/* Refresh */}
          <button
            onClick={refresh}
            className="v2-action"
            title="Refresh"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>

        {/* Result count */}
        <p className="text-[11px] text-slate-500 mb-3">
          {loading
            ? "Loading clients…"
            : `${filtered.length} client${filtered.length !== 1 ? "s" : ""}${
                search || statusFilter !== "all" ? " (filtered)" : ""
              }`}
        </p>

        {error ? (
          <div className="v2-tile rounded-xl p-4 text-center">
            <p className="text-sm text-rose-400 font-semibold">
              Failed to load clients
            </p>
            <p className="text-xs text-slate-500 mt-1">{error}</p>
            <button
              onClick={refresh}
              className="mt-3 v2-action"
            >
              Retry
            </button>
          </div>
        ) : loading ? (
          <LoadingBlock label="Loading client data…" />
        ) : paginated.length === 0 ? (
          <div className="v2-tile rounded-xl p-8 text-center">
            <p className="text-sm font-semibold text-white">No clients found</p>
            <p className="text-xs text-slate-400 mt-1">
              {search || statusFilter !== "all"
                ? "Try adjusting your filters."
                : "Add your first client to get started."}
            </p>
          </div>
        ) : (
          <>
            {/* Scrollable table */}
            <div className="overflow-x-auto -mx-4 sm:-mx-5">
              <table className="min-w-full">
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <TH
                      label="Client"
                      sortKey="name"
                      {...commonTHProps}
                    />
                    <TH
                      label="Email"
                      sortKey="email"
                      {...commonTHProps}
                    />
                    <TH
                      label="Net Worth"
                      sortKey="totalNetWorth"
                      {...commonTHProps}
                    />
                    <TH
                      label="Allocation"
                      sortKey=""
                      {...commonTHProps}
                    />
                    <TH
                      label="Rent/Mo"
                      sortKey="monthlyRentIncome"
                      {...commonTHProps}
                    />
                    <TH
                      label="Props"
                      sortKey="propertiesCount"
                      {...commonTHProps}
                    />
                    <TH
                      label="Equity %"
                      sortKey="equityExposurePct"
                      {...commonTHProps}
                    />
                    <TH
                      label="Last Activity"
                      sortKey="lastActivity"
                      {...commonTHProps}
                    />
                    <TH
                      label="Status"
                      sortKey="isActive"
                      {...commonTHProps}
                    />
                    <th className="px-3 py-3 text-[10px] uppercase tracking-[0.14em] font-semibold text-slate-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((client) => (
                    <tr
                      key={client.id}
                      className="border-b border-white/5 hover:bg-white/[0.035] transition-colors cursor-pointer"
                      onClick={() => setSelectedClient(client)}
                    >
                      {/* Client Name */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                            style={{
                              background: "rgba(56,189,248,0.15)",
                              color: "#38bdf8",
                              border: "1px solid rgba(56,189,248,0.25)",
                            }}
                          >
                            {client.name
                              .split(" ")
                              .filter((n: string) => n)
                              .map((n: string) => n[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-white whitespace-nowrap">
                              {client.name}
                            </p>
                            {client.phone && (
                              <p className="text-[10px] text-slate-500">
                                {client.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-3 py-3">
                        <p className="text-xs text-slate-300 whitespace-nowrap">
                          {client.email}
                        </p>
                      </td>

                      {/* Net Worth */}
                      <td className="px-3 py-3">
                        <p className="text-xs font-semibold text-white whitespace-nowrap">
                          {client.totalNetWorth > 0
                            ? fmtCompact(client.totalNetWorth)
                            : "—"}
                        </p>
                      </td>

                      {/* Allocation Mix */}
                      <td className="px-3 py-3">
                        <AllocationMiniBar mix={client.allocationMix} />
                      </td>

                      {/* Monthly Rent */}
                      <td className="px-3 py-3">
                        <p className="text-xs text-slate-300 whitespace-nowrap">
                          {client.monthlyRentIncome > 0
                            ? fmtCompact(client.monthlyRentIncome)
                            : "—"}
                        </p>
                      </td>

                      {/* Properties Count */}
                      <td className="px-3 py-3 text-center">
                        <span className="text-xs font-semibold text-slate-300">
                          {client.propertiesCount || "—"}
                        </span>
                      </td>

                      {/* Equity Exposure */}
                      <td className="px-3 py-3">
                        <p className="text-xs text-slate-300 whitespace-nowrap">
                          {client.totalNetWorth > 0
                            ? fmtPercent(client.equityExposurePct)
                            : "—"}
                        </p>
                      </td>

                      {/* Last Activity */}
                      <td className="px-3 py-3">
                        <p className="text-xs text-slate-400 whitespace-nowrap">
                          {fmtDate(client.lastActivity)}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3">
                        <StatusPill
                          label={client.isActive ? "Active" : "Inactive"}
                          tone={client.isActive ? "success" : "danger"}
                        />
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedClient(client);
                          }}
                          className="v2-action text-sky-300"
                          title="View detail"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/8">
                <p className="text-[11px] text-slate-500">
                  Page {page} of {totalPages} ·{" "}
                  {(page - 1) * pageSize + 1}–
                  {Math.min(page * pageSize, filtered.length)} of{" "}
                  {filtered.length}
                </p>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="v2-action disabled:opacity-30"
                  >
                    ←
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const p =
                      totalPages <= 5
                        ? i + 1
                        : page <= 3
                        ? i + 1
                        : page >= totalPages - 2
                        ? totalPages - 4 + i
                        : page - 2 + i;
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`v2-action w-7 h-7 p-0 ${
                          page === p ? "v2-filter-active" : ""
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    onClick={() =>
                      setPage((p) => Math.min(totalPages, p + 1))
                    }
                    disabled={page === totalPages}
                    className="v2-action disabled:opacity-30"
                  >
                    →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </SurfaceCard>

      {/* Client Detail Slide-Over */}
      <ClientDetailPanel
        client={selectedClient}
        onClose={() => setSelectedClient(null)}
      />
    </div>
  );
}
