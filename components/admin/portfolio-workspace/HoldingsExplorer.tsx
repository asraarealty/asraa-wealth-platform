"use client";

import { fmtCurrency, fmtPercent } from "@/lib/formatters";
import type { ClientHoldingRow } from "./types";

interface HoldingView {
  row: ClientHoldingRow;
  livePrice: number;
  liveValue: number;
  investedValue: number;
  unrealizedPnL: number;
}

interface HoldingsExplorerProps {
  holdings: HoldingView[];
  onOpenClient: (clientId: number) => void;
}

export function HoldingsExplorer({ holdings, onOpenClient }: HoldingsExplorerProps) {
  if (holdings.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-sm text-slate-400">
        No holdings matched the current portfolio search filters.
      </div>
    );
  }

  let currentClientId: number | null = null;

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="min-w-full text-left text-xs">
        <thead className="bg-white/[0.03] text-[10px] uppercase tracking-[0.14em] text-slate-400">
          <tr>
            <th className="px-3 py-2">Client / Holding</th>
            <th className="px-3 py-2">Class</th>
            <th className="px-3 py-2">Units</th>
            <th className="px-3 py-2">Live price</th>
            <th className="px-3 py-2">Live value</th>
            <th className="px-3 py-2">Unrealized P&L</th>
            <th className="px-3 py-2">Lifecycle</th>
            <th className="px-3 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((entry) => {
            const showClientHeader = currentClientId !== entry.row.client.id;
            currentClientId = entry.row.client.id;
            return (
              <tr key={entry.row.key} className="border-t border-white/8 bg-white/[0.01]">
                <td className="px-3 py-3 align-top">
                  {showClientHeader ? (
                    <div>
                      <p className="text-sm font-semibold text-white">{entry.row.client.name}</p>
                      <p className="text-[11px] text-slate-500">{entry.row.client.email}</p>
                    </div>
                  ) : null}
                  <p className="mt-1 text-xs text-slate-200">
                    {entry.row.asset.symbol || entry.row.asset.name} · {entry.row.asset.name}
                  </p>
                </td>
                <td className="px-3 py-3 text-slate-300">{entry.row.asset.type.toUpperCase()}</td>
                <td className="px-3 py-3 text-slate-300">{entry.row.canonical.units.toFixed(2)}</td>
                <td className="px-3 py-3 text-slate-300">{fmtCurrency(entry.livePrice)}</td>
                <td className="px-3 py-3 font-semibold text-white">{fmtCurrency(entry.liveValue)}</td>
                <td className={`px-3 py-3 ${entry.unrealizedPnL >= 0 ? "text-emerald-200" : "text-rose-200"}`}>
                  {fmtCurrency(entry.unrealizedPnL)}
                  <span className="ml-1 text-[11px] text-slate-400">
                    ({fmtPercent((entry.unrealizedPnL / Math.max(entry.investedValue, 1)) * 100, true)})
                  </span>
                </td>
                <td className="px-3 py-3 text-slate-300">{entry.row.client.canonicalStatus}</td>
                <td className="px-3 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onOpenClient(entry.row.client.id)}
                    className="rounded-lg border border-sky-300/30 bg-sky-500/10 px-2 py-1 text-[11px] font-semibold text-sky-100"
                  >
                    Operate
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
