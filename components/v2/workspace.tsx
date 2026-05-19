"use client";

import type { ReactNode } from "react";
import { fmtCurrency, fmtPercent } from "@/lib/formatters";

export type WorkspaceMode = "overview" | "portfolio" | "operations" | "intelligence";
const HOLDINGS_TABLE_MIN_WIDTH_PX = 1040;
const HOLDINGS_TABLE_HEAD_BG = "#071229";

export function formatUnits(value: number, assetType: string): string {
  const precision = assetType === "commodity" ? 4 : assetType === "stock" ? 3 : 2;
  return value.toFixed(precision);
}

export function WorkspaceTabs({
  value,
  onChange,
}: {
  value: WorkspaceMode;
  onChange: (next: WorkspaceMode) => void;
}) {
  const tabs: Array<{ id: WorkspaceMode; label: string }> = [
    { id: "overview", label: "Overview" },
    { id: "portfolio", label: "Portfolio" },
    { id: "operations", label: "Operations" },
    { id: "intelligence", label: "Intelligence" },
  ];
  return (
    <div className="overflow-x-auto">
      <div className="inline-flex min-w-full gap-2 rounded-xl border border-white/8 bg-white/[0.03] p-1 sm:min-w-0">
        {tabs.map((tab) => {
          const active = tab.id === value;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                active
                  ? "bg-sky-500/20 text-sky-100"
                  : "text-slate-300 hover:bg-white/[0.05] hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SearchCommandBar({
  value,
  onChange,
  placeholder = "Search assets, clients, portfolios, sectors, themes...",
  label = "Wealth OS command search",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-blue-400/70">Universal Search</p>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="v2-input mt-2 w-full"
        aria-label={label}
      />
    </div>
  );
}

export function IntelligencePanel({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {sub ? <p className="mt-1 text-xs text-slate-400">{sub}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function LifecyclePanel({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="mt-1 text-xs text-slate-400">{sub ?? "Lifecycle controls and operational workflow state."}</p>
        </div>
        <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-blue-200">
          Lifecycle
        </span>
      </div>
      {children}
    </section>
  );
}

export function KPIGrid({
  items,
}: {
  items: Array<{ label: string; value: string; tone?: "default" | "good" | "warn" | "bad" }>;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{item.label}</p>
          <p
            className={`mt-2 text-sm font-semibold ${
              item.tone === "good"
                ? "text-emerald-200"
                : item.tone === "warn"
                  ? "text-amber-200"
                  : item.tone === "bad"
                    ? "text-rose-200"
                    : "text-white"
            }`}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export function ActionBar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

export function AllocationChart({
  segments,
}: {
  segments: Array<{ label: string; value: number; color: string }>;
}) {
  const total = segments.reduce((sum, segment) => sum + Math.max(segment.value, 0), 0);
  return (
    <div className="space-y-3">
      <div className="flex h-2 overflow-hidden rounded-full bg-white/5">
        {segments
          .filter((segment) => segment.value > 0)
          .map((segment) => (
            <div
              key={segment.label}
              className="h-full"
              style={{ width: `${total > 0 ? (segment.value / total) * 100 : 0}%`, background: segment.color }}
            />
          ))}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {segments.map((segment) => (
          <div key={segment.label} className="rounded-lg border border-white/8 bg-white/[0.02] p-2">
            <p className="text-[11px] text-slate-300">{segment.label}</p>
            <p className="mt-1 text-sm font-semibold text-white">{fmtCurrency(segment.value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AllocationPanel({
  title,
  sub,
  segments,
}: {
  title: string;
  sub?: string;
  segments: Array<{ label: string; value: number; color: string }>;
}) {
  return (
    <IntelligencePanel title={title} sub={sub}>
      <AllocationChart segments={segments} />
    </IntelligencePanel>
  );
}

export function OpportunityFeed({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <p className="text-xs text-slate-500">No opportunities currently surfaced.</p>;
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item} className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-slate-300">
          {item}
        </div>
      ))}
    </div>
  );
}

export function RiskPanel({
  items,
}: {
  items: Array<{ label: string; value: string; tone?: "default" | "good" | "warn" | "bad" }>;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-white/8 bg-white/[0.02] p-3">
          <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400">{item.label}</p>
          <p
            className={`mt-1 text-sm font-semibold ${
              item.tone === "good"
                ? "text-emerald-200"
                : item.tone === "warn"
                  ? "text-amber-200"
                  : item.tone === "bad"
                    ? "text-rose-200"
                    : "text-white"
            }`}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-white/20 bg-white/[0.02] p-6 text-center">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-xs text-slate-400">{detail}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function PartialFailureBanner({
  message,
  onRetry,
  pending,
}: {
  message: string;
  onRetry?: () => void;
  pending?: boolean;
}) {
  return (
    <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
      {message}
      {onRetry ? (
        <button type="button" className="ml-2 underline" onClick={onRetry}>
          {pending ? "Refreshing…" : "Retry"}
        </button>
      ) : null}
    </div>
  );
}

export function AsyncBoundary({
  loading,
  error,
  loadingLabel = "Loading…",
  children,
}: {
  loading: boolean;
  error?: string | null;
  loadingLabel?: string;
  children: ReactNode;
}) {
  if (loading) {
    return (
      <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-6 text-center text-sm text-slate-400">
        {loadingLabel}
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
        {error}
      </div>
    );
  }
  return <>{children}</>;
}

export function DrawerShell({
  backdrop,
  panel,
}: {
  backdrop: ReactNode;
  panel: ReactNode;
}) {
  return (
    <div className="contents" data-drawer-shell="wealth-os">
      {backdrop}
      {panel}
    </div>
  );
}

export function OperationalDrawer({
  backdrop,
  panel,
}: {
  backdrop: ReactNode;
  panel: ReactNode;
}) {
  return (
    <div data-operational-drawer="true">
      <DrawerShell backdrop={backdrop} panel={panel} />
    </div>
  );
}

export function HoldingsTable({
  rows,
  onOpenClient,
  onEditAsset,
  onDeleteAsset,
  onOpenIntelligence,
}: {
  rows: Array<{
    key: string;
    clientId: number;
    clientName: string;
    lifecycle: string;
    assetName: string;
    symbol?: string;
    assetType: string;
    units: number;
    livePrice: number;
    liveValue: number;
    investedValue: number;
    allocationPct: number;
    unrealizedPnL: number;
    unrealizedPnLPct: number;
    quoteConnected: boolean;
    groupingLabel: string;
    assetId: number;
  }>;
  onOpenClient: (clientId: number) => void;
  onEditAsset: (assetId: number) => void;
  onDeleteAsset: (assetId: number) => void;
  onOpenIntelligence: () => void;
}) {
  if (rows.length === 0) {
    return <EmptyState title="No holdings found" detail="Adjust filters or add holdings to activate this portfolio view." />;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/8">
      <table className="w-full text-left text-xs" style={{ minWidth: `${HOLDINGS_TABLE_MIN_WIDTH_PX}px` }}>
        <thead
          className="sticky top-0 z-10 text-[10px] uppercase tracking-[0.14em] text-slate-400"
          style={{ backgroundColor: HOLDINGS_TABLE_HEAD_BG }}
        >
          <tr>
            <th className="px-3 py-2">Asset</th>
            <th className="px-3 py-2">Class</th>
            <th className="px-3 py-2">Units</th>
            <th className="px-3 py-2">Live</th>
            <th className="px-3 py-2">Value</th>
            <th className="px-3 py-2">Allocation</th>
            <th className="px-3 py-2">P&L</th>
            <th className="px-3 py-2">Lifecycle</th>
            <th className="px-3 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t border-white/8 bg-white/[0.01] hover:bg-white/[0.03]">
              <td className="px-3 py-3">
                <p className="text-sm font-semibold text-white">{row.symbol || row.assetName}</p>
                {row.symbol ? <p className="text-[11px] text-slate-400">{row.assetName}</p> : null}
                <p className="mt-1 text-[11px] text-slate-500">{row.clientName}</p>
              </td>
              <td className="px-3 py-3 text-slate-300">{row.groupingLabel}</td>
              <td className="px-3 py-3 text-slate-300">{formatUnits(row.units, row.assetType)}</td>
              <td className="px-3 py-3">
                <p className="font-semibold text-white">{fmtCurrency(row.livePrice)}</p>
                <p className={`text-[11px] ${row.quoteConnected ? "text-emerald-300" : "text-slate-500"}`}>
                  {row.quoteConnected ? "Live" : "Cached"}
                </p>
              </td>
              <td className="px-3 py-3 font-semibold text-white">{fmtCurrency(row.liveValue)}</td>
              <td className="px-3 py-3 text-slate-300">{fmtPercent(row.allocationPct)}</td>
              <td className="px-3 py-3">
                <p className={row.unrealizedPnL >= 0 ? "text-emerald-200" : "text-rose-200"}>{fmtCurrency(row.unrealizedPnL)}</p>
                <p className="text-[11px] text-slate-400">{fmtPercent(row.unrealizedPnLPct, true)}</p>
              </td>
              <td className="px-3 py-3 text-slate-300">{row.lifecycle}</td>
              <td className="px-3 py-3">
                <div className="flex justify-end gap-1">
                  <button type="button" onClick={() => onOpenClient(row.clientId)} className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-slate-200">
                    Open
                  </button>
                  <button type="button" onClick={() => onEditAsset(row.assetId)} className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-slate-200">
                    Edit
                  </button>
                  <button type="button" onClick={() => onDeleteAsset(row.assetId)} className="rounded-md border border-rose-400/20 px-2 py-1 text-[11px] text-rose-200">
                    Delete
                  </button>
                  <button type="button" onClick={onOpenIntelligence} className="rounded-md border border-sky-300/30 bg-sky-500/10 px-2 py-1 text-[11px] text-sky-100">
                    Intel
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
