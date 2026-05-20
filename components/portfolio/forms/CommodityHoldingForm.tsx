"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { searchMarket } from "@/domains/market/search";
import { formatCurrency, formatQuantity } from "@/lib/formatters/finance";
import type { FormBaseProps, SearchResultDTO, SelectedInstrumentDTO } from "./types";

const schema = z.object({
  name: z.string().trim().min(1, "Commodity is required"),
  symbol: z.string().trim().min(1, "Commodity symbol is required"),
  quantity: z.number().positive("Quantity must be greater than 0"),
  entryPrice: z.number().nonnegative("Entry Price must be 0 or greater"),
});

function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function CommodityHoldingForm({
  mode,
  holding,
  isSubmitting = false,
  error = null,
  onDirtyChange,
  onSubmit,
}: FormBaseProps) {
  const [name, setName] = useState(holding?.name ?? "");
  const [symbol, setSymbol] = useState(holding?.symbol ?? "");
  const [quantity, setQuantity] = useState(String(holding?.quantity ?? ""));
  const [entryPrice, setEntryPrice] = useState(String(holding?.purchasePrice ?? ""));
  const [query, setQuery] = useState(holding?.symbol ?? holding?.name ?? "");
  const [searchResults, setSearchResults] = useState<SearchResultDTO[]>([]);
  const [selectedInstrument, setSelectedInstrument] = useState<SelectedInstrumentDTO | null>(
    holding?.symbol
      ? {
          id: `${holding.assetType}:${holding.symbol}`,
          symbol: holding.symbol,
          name: holding.name ?? holding.symbol,
          kind: "commodity",
          market: "Commodity",
          category: "Commodity",
          price: holding.valuation.spotPrice ?? holding.valuation.currentPrice,
        }
      : null
  );
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const initialSnapshot = useRef(
    JSON.stringify({
      name: holding?.name ?? "",
      symbol: holding?.symbol ?? "",
      quantity: String(holding?.quantity ?? ""),
      entryPrice: String(holding?.purchasePrice ?? ""),
      selectedSymbol: holding?.symbol ?? "",
    })
  );

  useEffect(() => {
    const snapshot = JSON.stringify({
      name,
      symbol,
      quantity,
      entryPrice,
      selectedSymbol: selectedInstrument?.symbol ?? "",
    });
    onDirtyChange(snapshot !== initialSnapshot.current);
  }, [name, symbol, quantity, entryPrice, selectedInstrument?.symbol, onDirtyChange]);

  useEffect(() => {
    const normalized = query.trim();
    const controller = new AbortController();
    const timer = setTimeout(() => {
      if (normalized.length < 2) {
        setSearchResults([]);
        setLoadingSearch(false);
        return;
      }
      setLoadingSearch(true);
      void searchMarket(normalized, { signal: controller.signal })
        .then((result) => {
          const filtered = result.groups.commodities
            .filter((item) => item.kind === "commodity" || item.kind === "metal")
            .slice(0, 8)
            .map(
              (item): SearchResultDTO => ({
                id: item.id,
                symbol: item.symbol,
                name: item.name,
                kind: item.kind,
                market: item.market,
                category: item.category,
                exchange: item.searchLabel,
                price: item.price,
              })
            );
          setSearchResults(filtered);
        })
        .catch(() => undefined)
        .finally(() => setLoadingSearch(false));
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const spotPrice = selectedInstrument?.price ?? holding?.valuation.spotPrice ?? holding?.valuation.currentPrice;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = schema.safeParse({
      name,
      symbol,
      quantity: toNumber(quantity),
      entryPrice: toNumber(entryPrice),
    });

    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Please check the form values");
      return;
    }

    setValidationError(null);
    await onSubmit({
      type: "commodity",
      name: parsed.data.name,
      symbol: parsed.data.symbol,
      quantity: parsed.data.quantity,
      avg_price: parsed.data.entryPrice,
      ...(spotPrice !== undefined ? { current_price: spotPrice } : {}),
      tags: [],
    });
  }

  const readOnly = useMemo(
    () => [
      { label: "Spot Price", value: formatCurrency(spotPrice) },
      { label: "Current Value", value: formatCurrency(holding?.valuation.currentValue) },
      { label: "P/L", value: formatCurrency(holding?.valuation.profitLoss ?? holding?.valuation.unrealizedPnl) },
    ],
    [spotPrice, holding?.valuation.currentValue, holding?.valuation.profitLoss, holding?.valuation.unrealizedPnl]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Commodity Search</label>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search commodities"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-300/40"
        />
        {loadingSearch ? <p className="text-xs text-slate-400">Searching…</p> : null}
        {!loadingSearch && searchResults.length > 0 ? (
          <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-[#040915] p-2">
            {searchResults.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  const selected: SelectedInstrumentDTO = { ...item };
                  setSelectedInstrument(selected);
                  setName(item.name);
                  setSymbol(item.symbol);
                  setQuery(`${item.symbol} · ${item.name}`);
                  setSearchResults([]);
                }}
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-xs text-slate-200 transition hover:bg-white/[0.08]"
              >
                <p className="font-semibold text-white">{item.symbol}</p>
                <p className="truncate text-slate-300">{item.name}</p>
                <p className="text-[10px] text-slate-500">{item.exchange || item.category}</p>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">Quantity</label>
          <input type="number" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">Entry Price</label>
          <input type="number" value={entryPrice} onChange={(event) => setEntryPrice(event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {readOnly.map((metric) => (
          <div key={metric.label} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{metric.label}</p>
            <p className="mt-1 text-xs font-semibold text-slate-100">{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-xs text-slate-300">
        Selected Commodity: <span className="font-semibold text-white">{(selectedInstrument?.symbol ?? symbol) || "—"}</span> · Quantity {formatQuantity(quantity)}
      </div>

      {(validationError || error) ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{validationError ?? error}</div>
      ) : null}

      <button type="submit" disabled={isSubmitting} className="w-full rounded-2xl bg-[linear-gradient(135deg,#38bdf8,#3b82f6)] py-4 text-sm font-bold text-[#04102a] transition disabled:opacity-60">
        {isSubmitting ? "Saving…" : mode === "create" ? "Add Holding" : "Save Changes"}
      </button>
    </form>
  );
}
