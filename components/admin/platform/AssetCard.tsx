"use client";

import Link from "next/link";
import type { Asset as DashboardAsset } from "@/lib/types/assets";
import type { Asset as AdminAsset } from "@/lib/api";
import { fmtCurrency, fmtPercent } from "@/lib/formatters";
import type { MarketPricePoint } from "@/lib/services/market";

function getEditHref(asset: Asset): string {
  if (asset.type === "stock") return `/stocks/${asset.id}/edit`;
  if (asset.type === "mf") return `/mutual-funds/${asset.id}/edit`;
  if (asset.type === "property") return `/properties/${asset.id}/edit`;
  return `/assets/${asset.id}/edit`;
}

function getViewHref(asset: Asset): string {
  return asset.type === "property" ? "/real-estate" : "/assets";
}

function getIcon(asset: Asset) {
  if (asset.type === "stock") return "↗";
  if (asset.type === "mf") return "◎";
  if (asset.type === "commodity") return "◈";
  return "⌂";
}

function getTypeLabel(asset: Asset) {
  if (asset.type === "mf") return "Mutual fund";
  if (asset.type === "property") return "Property";
  if (asset.type === "commodity") return "Commodity";
  return "Equity";
}

function getUnitsLabel(asset: Asset) {
  if (asset.type === "mf") return "Units";
  if (asset.type === "property") return "Assets";
  return "Qty";
}

function formatDate(value?: string | null) {
  if (!value) return "Awaiting sync";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}


function read(asset: Asset, ...keys: string[]) {
  const record = asset as unknown as Record<string, unknown>;
  for (const key of keys) {
    if (record[key] !== undefined) return record[key];
  }
  return undefined;
}

type Asset = DashboardAsset | AdminAsset;

export function AssetCard({
  asset,
  allocationPct,
  livePrice,
  liveValue,
  pricePoint,
  onDelete,
  deleteLabel = "Delete",
  onView,
}: {
  asset: Asset;
  allocationPct?: number;
  livePrice?: number;
  liveValue?: number;
  pricePoint?: MarketPricePoint;
  onDelete?: () => void;
  deleteLabel?: string;
  onView?: () => void;
}) {
  const avgCost = asset.type === "property" ? toNumber(read(asset, "purchase_price", "purchasePrice")) : asset.type === "mf" ? toNumber(read(asset, "nav", "avg_price", "avgPrice")) : toNumber(read(asset, "avg_price", "avgPrice"));
  const effectiveLivePrice = livePrice ?? (asset.type === "property" ? toNumber(read(asset, "current_value", "currentValue", "value")) : asset.type === "mf" ? toNumber(read(asset, "nav", "current_price", "currentPrice", "avg_price", "avgPrice")) : toNumber(read(asset, "current_price", "currentPrice", "avg_price", "avgPrice")));
  const units = asset.type === "property" ? 1 : toNumber(read(asset, "units", "quantity"));
  const effectiveLiveValue = liveValue ?? (asset.type === "property" ? toNumber(read(asset, "current_value", "currentValue", "value")) : effectiveLivePrice * units || toNumber(read(asset, "value")));
  const investedValue = asset.type === "property" ? toNumber(read(asset, "purchase_price", "purchasePrice")) : units * avgCost;
  const pnlPct = investedValue > 0 ? ((effectiveLiveValue - investedValue) / investedValue) * 100 : toNumber(read(asset, "return_percentage", "returnPercent", "return_percent"));
  const income = asset.type === "property" ? toNumber(read(asset, "rent_amount", "rentAmount")) : 0;
  const risk = (allocationPct ?? 0) >= 35 ? "Concentrated" : (allocationPct ?? 0) >= 15 ? "Elevated" : "Balanced";
  const occupancy = asset.type === "property" ? (read(asset, "tenant_name", "tenantName") ? "Occupied" : "Pipeline") : null;
  const tenant = asset.type === "property" ? (read(asset, "tenant_name", "tenantName") as string | null | undefined ?? null) : null;
  const propertyVisual = asset.type === "property" ? String(read(asset, "location") ?? asset.name).slice(0, 2).toUpperCase() : getIcon(asset);

  return (
    <article className="flex h-full flex-col rounded-[1.4rem] border border-white/8 bg-[linear-gradient(165deg,rgba(10,22,51,0.88),rgba(4,9,21,0.92))] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.28)]">
      <div className="flex items-start gap-3">
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border text-lg font-semibold ${asset.type === "property" ? "border-emerald-400/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.24),rgba(14,116,144,0.18))] text-emerald-100" : "border-sky-400/15 bg-sky-500/10 text-sky-200"}`}>
          {propertyVisual}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-white">{asset.name || "Unnamed asset"}</h3>
              <p className="mt-1 truncate text-xs uppercase tracking-[0.14em] text-slate-400">{asset.symbol || getTypeLabel(asset)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-white">{fmtCurrency(effectiveLiveValue)}</p>
              <p className={`mt-1 text-xs font-semibold ${pnlPct >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{fmtPercent(pnlPct, true)}</p>
            </div>
          </div>
          {(occupancy || tenant) ? (
            <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
              {occupancy ? <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-1 font-semibold uppercase tracking-[0.12em] text-emerald-100">{occupancy}</span> : null}
              {tenant ? <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-slate-200">{tenant}</span> : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 text-xs">
        <Metric label={getUnitsLabel(asset)} value={asset.type === "property" ? "1 property" : `${units || 0}`} />
        <Metric label="Avg cost" value={avgCost > 0 ? fmtCurrency(avgCost) : "Awaiting cost basis"} />
        <Metric label="Live price" value={effectiveLivePrice > 0 ? fmtCurrency(effectiveLivePrice) : "Awaiting price sync"} />
        <Metric label="Allocation" value={allocationPct != null && allocationPct > 0 ? fmtPercent(allocationPct) : "Portfolio pending"} />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2.5 text-xs">
        <Metric label="Asset class" value={getTypeLabel(asset)} />
        <Metric label="Income" value={income > 0 ? `${fmtCurrency(income)}/mo` : "No active income"} />
        <Metric label="Risk" value={risk} />
        <Metric label="Last updated" value={formatDate((pricePoint?.asOf as string | undefined) ?? (read(asset, "created_at", "createdAt") as string | undefined))} />
      </div>

      <div className="mt-4 flex items-center gap-2 pt-3">
        {onView ? (
          <button type="button" onClick={onView} className="flex-1 rounded-xl border border-sky-400/20 bg-sky-500/10 px-3 py-2 text-xs font-semibold text-sky-100 transition hover:bg-sky-500/20">
            View
          </button>
        ) : (
          <Link href={getViewHref(asset)} className="flex-1 rounded-xl border border-sky-400/20 bg-sky-500/10 px-3 py-2 text-center text-xs font-semibold text-sky-100 transition hover:bg-sky-500/20">
            View
          </Link>
        )}
        <Link href={getEditHref(asset)} className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center text-xs font-semibold text-slate-100 transition hover:bg-white/10">
          Edit
        </Link>
        <button
          type="button"
          onClick={onDelete}
          disabled={!onDelete}
          className="flex-1 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {deleteLabel}
        </button>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-xs font-semibold text-slate-100">{value}</p>
    </div>
  );
}
