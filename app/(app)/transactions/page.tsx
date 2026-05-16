"use client";

import { useMemo, useState } from "react";
import { useOperatingSystemData } from "@/lib/hooks/useOperatingSystem";
import { EmptyBlock, LoadingBlock, SectionHeader, SurfaceCard } from "@/components/v2/ui";

function fmt(v: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);
}

export default function TransactionsPage() {
  const { data, isLoading, isError } = useOperatingSystemData();
  const [kind, setKind] = useState<"all" | "buy" | "sell">("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return data.transactions
      .filter((t) => (kind === "all" ? true : t.type === kind))
      .filter((t) => t.symbol.toLowerCase().includes(query.toLowerCase()));
  }, [data.transactions, kind, query]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, t) => {
        acc.volume += t.total;
        if (t.type === "buy") acc.buy += t.total;
        else acc.sell += t.total;
        return acc;
      },
      { volume: 0, buy: 0, sell: 0 }
    );
  }, [filtered]);

  if (isLoading) return <LoadingBlock label="Loading transactions..." />;
  if (isError) return <EmptyBlock title="Transaction module unavailable" message="Could not retrieve transaction ledger." />;

  return (
    <div className="space-y-5">
      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader eyebrow="Transactions" title="Ledger and reconciliation" subtitle="Filterable, backend-connected trade history" />

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="v2-tile rounded-xl p-3">
            <p className="text-xs text-slate-400">Total Volume</p>
            <p className="text-lg font-bold text-white mt-1">{fmt(totals.volume)}</p>
          </div>
          <div className="v2-tile rounded-xl p-3">
            <p className="text-xs text-slate-400">Buys</p>
            <p className="text-lg font-bold text-emerald-300 mt-1">{fmt(totals.buy)}</p>
          </div>
          <div className="v2-tile rounded-xl p-3">
            <p className="text-xs text-slate-400">Sells</p>
            <p className="text-lg font-bold text-rose-300 mt-1">{fmt(totals.sell)}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {(["all", "buy", "sell"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`v2-filter ${kind === k ? "v2-filter-active" : ""}`}
              type="button"
            >
              {k.toUpperCase()}
            </button>
          ))}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by symbol"
            className="v2-input ml-auto"
          />
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-2 sm:p-3 overflow-x-auto">
        {filtered.length === 0 ? (
          <p className="text-sm text-slate-400 p-4">No transactions match the selected filters.</p>
        ) : (
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-white/10">
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3">Symbol</th>
                <th className="py-2 px-3">Type</th>
                <th className="py-2 px-3">Qty</th>
                <th className="py-2 px-3">Price</th>
                <th className="py-2 px-3">Total</th>
                <th className="py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-white/5">
                  <td className="py-2 px-3 text-slate-300">{new Date(t.date).toLocaleDateString()}</td>
                  <td className="py-2 px-3 text-white font-semibold">{t.symbol}</td>
                  <td className={`py-2 px-3 font-semibold ${t.type === "buy" ? "text-emerald-300" : "text-rose-300"}`}>{t.type.toUpperCase()}</td>
                  <td className="py-2 px-3 text-slate-300">{t.quantity}</td>
                  <td className="py-2 px-3 text-slate-300">{fmt(t.price)}</td>
                  <td className="py-2 px-3 text-white">{fmt(t.total)}</td>
                  <td className="py-2 px-3"><span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-400/20">Settled</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SurfaceCard>
    </div>
  );
}
