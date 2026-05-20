"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { searchMarket } from "@/domains/market/search";
import { formatCurrency, formatPercent, formatQuantity } from "@/lib/formatters/finance";
import type { FormBaseProps, SearchResultDTO, SelectedInstrumentDTO } from "./types";

const schema = z.object({
  name: z.string().trim().min(1, "Instrument is required"),
  symbol: z.string().trim().min(1, "Instrument symbol is required"),
  quantity: z.number().positive("Quantity must be greater than 0"),
  purchasePrice: z.number().nonnegative("Purchase Price must be 0 or greater"),
  purchaseDate: z.string().trim().min(1, "Purchase Date is required"),
});

function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function StockHoldingForm({
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
  const [purchasePrice, setPurchasePrice] = useState(String(holding?.purchasePrice ?? ""));
  const [purchaseDate, setPurchaseDate] = useState(holding?.purchaseDate ?? "");
  const [query, setQuery] = useState(holding?.symbol ?? holding?.name ?? "");
  const [searchResults, setSearchResults] = useState<SearchResultDTO[]>([]);
  const [selectedInstrument, setSelectedInstrument] = useState<SelectedInstrumentDTO | null>(
    holding?.symbol
      ? {
          id: `${holding.assetType}:${holding.symbol}`,
          symbol: holding.symbol,
          name: holding.name ?? holding.symbol,
          kind: "stock",
          market: "India",
          category: "Stock",
          price: holding.valuation.currentPrice,
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
      purchasePrice: String(holding?.purchasePrice ?? ""),
      purchaseDate: holding?.purchaseDate ?? "",
      selectedSymbol: holding?.symbol ?? "",
    })
  );

  useEffect(() => {
    const snapshot = JSON.stringify({
      name,
      symbol,
      quantity,
      purchasePrice,
      purchaseDate,
      selectedSymbol: selectedInstrument?.symbol ?? "",
    });
    onDirtyChange(snapshot !== initialSnapshot.current);
  }, [name, symbol, quantity, purchasePrice, purchaseDate, selectedInstrument?.symbol, onDirtyChange]);

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
          const merged = [...result.groups.stocks, ...(result.groups.etfs ?? [])]
            .filter((item) => item.kind === "stock" || item.kind === "global-stock" || item.kind === "etf")
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
          setSearchResults(merged);
        })
        .catch(() => undefined)
        .finally(() => setLoadingSearch(false));
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const currentPrice = selectedInstrument?.price ?? holding?.valuation.currentPrice;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = schema.safeParse({
      name,
      symbol,
      quantity: toNumber(quantity),
      purchasePrice: toNumber(purchasePrice),
      purchaseDate,
    });

    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Please check the form values");
      return;
    }

    setValidationError(null);
    await onSubmit({
      type: "stock",
      name: parsed.data.name,
      symbol: parsed.data.symbol,
      quantity: parsed.data.quantity,
      avg_price: parsed.data.purchasePrice,
      purchase_date: parsed.data.purchaseDate,
      ...(currentPrice !== undefined ? { current_price: currentPrice } : {}),
      tags: [],
    });
  }

  const readOnly = useMemo(
    () => [
      { label: "Current Price", value: formatCurrency(currentPrice) },
      { label: "Current Value", value: formatCurrency(holding?.valuation.currentValue) },
      { label: "Unrealized P/L", value: formatCurrency(holding?.valuation.unrealizedPnl ?? holding?.valuation.profitLoss) },
      { label: "Return %", value: formatPercent(holding?.valuation.returnPercent) },
    ],
    [currentPrice, holding?.valuation.currentValue, holding?.valuation.profitLoss, holding?.valuation.returnPercent, holding?.valuation.unrealizedPnl]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Instrument Search</label>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search stocks and ETFs"
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
                <p className="text-[10px] text-slate-500">{item.market} · {item.category}</p>
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
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">Purchase Price</label>
          <input type="number" value={purchasePrice} onChange={(event) => setPurchasePrice(event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none" />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">Purchase Date</label>
        <input type="date" value={purchaseDate} onChange={(event) => setPurchaseDate(event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none" />
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {readOnly.map((metric) => (
          <div key={metric.label} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{metric.label}</p>
            <p className="mt-1 text-xs font-semibold text-slate-100">{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-xs text-slate-300">
        Selected Instrument: <span className="font-semibold text-white">{selectedInstrument?.symbol ?? symbol || "—"}</span> · Qty {formatQuantity(quantity)} · Purchase Date {purchaseDate || "—"}
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
