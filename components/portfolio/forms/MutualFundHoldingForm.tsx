"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { searchMarket } from "@/domains/market/search";
import { formatCurrency, formatPercent, formatQuantity } from "@/lib/formatters/finance";
import type { FormBaseProps, SearchResultDTO, SelectedInstrumentDTO } from "./types";

const schema = z.object({
  name: z.string().trim().min(1, "Fund is required"),
  symbol: z.string().trim().min(1, "Fund code is required"),
  units: z.number().positive("Units must be greater than 0"),
  purchaseNav: z.number().nonnegative("Purchase NAV must be 0 or greater"),
  purchaseDate: z.string().trim().min(1, "Purchase Date is required"),
  folioNumber: z.string().trim().optional(),
});

function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeFundLabel(name: string, symbol: string): string {
  const normalized = name.replace(/\s+/g, " ").trim();
  if (!normalized) return symbol;
  return normalized;
}

function formatFundSearchValue(symbol: string, name: string): string {
  const normalizedName = normalizeFundLabel(name, symbol);
  return normalizedName || symbol;
}

export function MutualFundHoldingForm({
  mode,
  holding,
  isSubmitting = false,
  error = null,
  onDirtyChange,
  onSubmit,
}: FormBaseProps) {
  const [name, setName] = useState(holding?.name ?? "");
  const [symbol, setSymbol] = useState(holding?.symbol ?? "");
  const [units, setUnits] = useState(String(holding?.units ?? holding?.quantity ?? ""));
  const [purchaseNav, setPurchaseNav] = useState(String(holding?.purchaseNav ?? holding?.purchasePrice ?? ""));
  const [purchaseDate, setPurchaseDate] = useState(holding?.purchaseDate ?? "");
  const [folioNumber, setFolioNumber] = useState(holding?.folioNumber ?? "");
  const initialSymbol = holding?.symbol ?? "";
  const initialName = holding?.name ?? initialSymbol;
  const [query, setQuery] = useState(formatFundSearchValue(initialSymbol, initialName));
  const [searchResults, setSearchResults] = useState<SearchResultDTO[]>([]);
  const [selectedInstrument, setSelectedInstrument] = useState<SelectedInstrumentDTO | null>(
    holding?.symbol
      ? {
          id: `${holding.assetType}:${holding.symbol}`,
          symbol: holding.symbol,
          name: holding.name ?? holding.symbol,
          kind: "mutual-fund",
          market: "Fund",
          category: "Mutual Fund",
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
      units: String(holding?.units ?? holding?.quantity ?? ""),
      purchaseNav: String(holding?.purchaseNav ?? holding?.purchasePrice ?? ""),
      purchaseDate: holding?.purchaseDate ?? "",
      folioNumber: holding?.folioNumber ?? "",
      selectedSymbol: holding?.symbol ?? "",
    })
  );

  useEffect(() => {
    const snapshot = JSON.stringify({
      name,
      symbol,
      units,
      purchaseNav,
      purchaseDate,
      folioNumber,
      selectedSymbol: selectedInstrument?.symbol ?? "",
    });
    onDirtyChange(snapshot !== initialSnapshot.current);
  }, [name, symbol, units, purchaseNav, purchaseDate, folioNumber, selectedInstrument?.symbol, onDirtyChange]);

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
          const filtered = result.groups.mutualFunds.slice(0, 8).map(
            (item): SearchResultDTO => ({
              id: item.id,
              symbol: item.symbol,
              name: normalizeFundLabel(item.name, item.symbol),
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

  const currentNav = selectedInstrument?.price ?? holding?.valuation.currentPrice;
  const selectedFundSymbol = selectedInstrument?.symbol ?? symbol;
  const selectedFundLabel = normalizeFundLabel(selectedInstrument?.name ?? name, selectedFundSymbol);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = schema.safeParse({
      name,
      symbol,
      units: toNumber(units),
      purchaseNav: toNumber(purchaseNav),
      purchaseDate,
      folioNumber,
    });

    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Please check the form values");
      return;
    }

    setValidationError(null);
    await onSubmit({
      type: "mf",
      name: parsed.data.name,
      symbol: parsed.data.symbol,
      units: parsed.data.units,
      nav: parsed.data.purchaseNav,
      quantity: parsed.data.units,
      avg_price: parsed.data.purchaseNav,
      purchase_date: parsed.data.purchaseDate,
      ...(parsed.data.folioNumber ? { folio_number: parsed.data.folioNumber } : {}),
      ...(currentNav !== undefined ? { current_price: currentNav } : {}),
      tags: [],
    });
  }

  const readOnly = useMemo(
    () => [
      { label: "Current NAV", value: formatCurrency(currentNav) },
      { label: "Current Value", value: formatCurrency(holding?.valuation.currentValue) },
      { label: "Gain/Loss", value: formatCurrency(holding?.valuation.gainLoss ?? holding?.valuation.profitLoss) },
      { label: "Return %", value: formatPercent(holding?.valuation.returnPercent) },
    ],
    [currentNav, holding?.valuation.currentValue, holding?.valuation.gainLoss, holding?.valuation.profitLoss, holding?.valuation.returnPercent]
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">Fund Search</label>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search mutual funds"
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
                  setQuery(formatFundSearchValue(item.symbol, item.name));
                  setSearchResults([]);
                }}
                className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-xs text-slate-200 transition hover:bg-white/[0.08]"
              >
                <p className="truncate font-semibold text-white">{item.name}</p>
                <p className="text-[10px] text-slate-500">{item.exchange || item.category}</p>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">Units</label>
          <input type="number" value={units} onChange={(event) => setUnits(event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">Purchase NAV</label>
          <input type="number" value={purchaseNav} onChange={(event) => setPurchaseNav(event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">Purchase Date</label>
          <input type="date" value={purchaseDate} onChange={(event) => setPurchaseDate(event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">Folio Number</label>
          <input value={folioNumber} onChange={(event) => setFolioNumber(event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none" />
        </div>
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
        Selected Fund:{" "}
        <span className="font-semibold text-white">
          {selectedFundLabel || "—"}
        </span>{" "}
        {selectedFundSymbol && selectedFundLabel !== selectedFundSymbol ? (
          <span className="text-slate-400">({selectedFundSymbol})</span>
        ) : null}{" "}
        · Units {formatQuantity(units)}
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
