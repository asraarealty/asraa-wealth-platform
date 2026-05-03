"use client";

import { useState } from "react";
import type { Asset } from "@/lib/api";
import { fmtCurrency, fmtPercent } from "@/lib/formatters";

interface HoldingsTableProps {
  positions: Asset[];
}
const TYPE_LABELS: Record<Asset["type"], string> = {
  stock: "Stock",
  mf: "Mutual Fund",
  property: "Property",
};

const TYPE_BADGE_STYLES: Record<Asset["type"], { bg: string; color: string; border: string }> = {
  stock:    { bg: "rgba(0,229,255,0.08)",   color: "#00E5FF", border: "rgba(0,229,255,0.2)" },
  mf:       { bg: "rgba(0,255,159,0.08)",   color: "#00ff9f", border: "rgba(0,255,159,0.2)" },
  property: { bg: "rgba(79,140,255,0.08)",  color: "#4F8CFF", border: "rgba(79,140,255,0.2)" },
};

type SortKey = "name" | "type" | "value" | "returnPercent";
type SortDir = "asc" | "desc";

function computeReturnPercent(pos: Asset): number {
  const cost = (pos.avgPrice ?? 0) * (pos.quantity ?? 0);
  if (cost === 0) return 0;
  return ((pos.value - cost) / cost) * 100;
}

function getSortValue(pos: Asset, key: SortKey): string | number {
  if (key === "returnPercent") return computeReturnPercent(pos);
  return pos[key] ?? 0;
}

const COLUMNS: { key: SortKey | null; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "type", label: "Type" },
  { key: null, label: "Qty" },
  { key: null, label: "Avg Price" },
  { key: null, label: "Current Price" },
  { key: "value", label: "Value" },
  { key: "returnPercent", label: "Return %" },
];

export default function HoldingsTable({ positions }: HoldingsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("value");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(key: SortKey | null) {
    if (!key) return;
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sorted = [...positions].sort((a, b) => {
    let av: string | number = getSortValue(a, sortKey);
    let bv: string | number = getSortValue(b, sortKey);
    if (typeof av === "string") av = av.toLowerCase();
    if (typeof bv === "string") bv = bv.toLowerCase();
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  if (positions.length === 0) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <p className="text-sm text-gray-500">No holdings to display.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {COLUMNS.map(({ key, label }) => (
              <th
                key={label}
                onClick={() => handleSort(key)}
                className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest whitespace-nowrap select-none ${key ? "cursor-pointer hover:text-[#00E5FF]" : ""}`}
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  color: sortKey === key ? "#00E5FF" : "rgba(255,255,255,0.35)",
                  transition: "color 0.2s",
                }}
              >
                {label}
                {key && sortKey === key && (
                  <span className="ml-1 text-[10px]">
                    {sortDir === "asc" ? "▲" : "▼"}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((pos) => {
            const returnPercent = computeReturnPercent(pos);
            const isPositive = returnPercent >= 0;
            const badgeStyle = TYPE_BADGE_STYLES[pos.type];
            return (
              <tr
                key={pos.id}
                className="transition-all duration-200"
                style={{
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.background = "rgba(0,229,255,0.03)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.background = "transparent";
                }}
              >
                {/* Name */}
                <td className="px-4 py-3.5">
                  <div>
                    <p className="text-white font-medium truncate max-w-[160px]">
                      {pos.name}
                    </p>
                    {pos.symbol && (
                      <p className="text-xs text-white/30 font-mono mt-0.5">
                        {pos.symbol}
                      </p>
                    )}
                  </div>
                </td>
                {/* Type */}
                <td className="px-4 py-3.5">
                  <span
                    className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
                    style={{
                      background: badgeStyle.bg,
                      color: badgeStyle.color,
                      border: `1px solid ${badgeStyle.border}`,
                    }}
                  >
                    {TYPE_LABELS[pos.type]}
                  </span>
                </td>
                {/* Qty */}
                <td className="px-4 py-3.5 text-white/60 tabular-nums">
                  {(pos.quantity ?? 0).toLocaleString("en-IN")}
                </td>
                {/* Avg Price */}
                <td className="px-4 py-3.5 text-white/60 tabular-nums whitespace-nowrap">
                  {fmtCurrency(pos.avgPrice)}
                </td>
                {/* Current Price */}
                <td className="px-4 py-3.5 text-white font-medium tabular-nums whitespace-nowrap">
                  {fmtCurrency(pos.currentPrice ?? 0)}
                </td>
                {/* Value */}
                <td className="px-4 py-3.5 text-white font-semibold tabular-nums whitespace-nowrap">
                  {fmtCurrency(pos.value)}
                </td>
                {/* Return % */}
                <td className="px-4 py-3.5 font-semibold tabular-nums whitespace-nowrap">
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                    style={{
                      background: isPositive ? "rgba(0,255,159,0.08)" : "rgba(255,77,109,0.08)",
                      color: isPositive ? "#00ff9f" : "#ff4d6d",
                      border: `1px solid ${isPositive ? "rgba(0,255,159,0.2)" : "rgba(255,77,109,0.2)"}`,
                    }}
                  >
                    {isPositive ? "▲" : "▼"} {fmtPercent(Math.abs(returnPercent))}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
