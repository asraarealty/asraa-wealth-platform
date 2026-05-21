"use client";

import { memo, useEffect, useMemo, useState } from "react";
import { fetcher, toErrorMessage } from "@/lib/fetcher";
import { fetchBulkQuotes, type TickerQuote } from "@/domains/market";
import { useMarketDomainGraph } from "@/domains/market";

interface SnapshotInstrument {
  key: string;
  label: string;
  price: number;
  change: number;
  changePercent: number;
  sparkline: number[];
}

interface SnapshotState {
  items: SnapshotInstrument[];
  lastUpdated: string | null;
  error: string | null;
}

const POLL_INTERVAL_MS = 45_000;
const SPARKLINE_SEED_DIVISOR = 19;
const SPARKLINE_WAVE_FACTOR = 0.85;
const SPARKLINE_AMPLITUDE = 0.008;
const SPARKLINE_DRIFT_FACTOR = 0.8;

const INDEX_INSTRUMENTS = [
  { key: "^NSEI", label: "NIFTY" },
  { key: "^BSESN", label: "SENSEX" },
  { key: "^NSEBANK", label: "BANKNIFTY" },
  { key: "GOLD", label: "GOLD" },
  { key: "USDINR=X", label: "USDINR" },
  { key: "BTC-USD", label: "BTC" },
  { key: "^VIX", label: "VIX" },
  { key: "ES=F", label: "US Futures" },
  { key: "^TNX", label: "Bond Yield" },
] as const;

function safeRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function toNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function unwrapPayload(value: unknown): unknown {
  const record = safeRecord(value);
  if (record.data && typeof record.data === "object" && "data" in safeRecord(record.data)) {
    return safeRecord(record.data).data;
  }
  if ("data" in record) return record.data;
  return value;
}

function buildSparkline(seed: string, price: number, changePercent: number) {
  const charSeed = Array.from(seed).reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 5), 0);
  const anchor = price > 0 ? price : 100;
  return Array.from({ length: 10 }, (_, index) => {
    const wave = Math.sin((index + 1 + charSeed / SPARKLINE_SEED_DIVISOR) * SPARKLINE_WAVE_FACTOR) * (anchor * SPARKLINE_AMPLITUDE);
    const drift = ((index - 4.5) / 9) * ((changePercent / 100) * anchor * SPARKLINE_DRIFT_FACTOR);
    return Number((anchor - drift + wave).toFixed(2));
  });
}

function formatPrice(label: string, value: number) {
  if (label === "Bond Yield") {
    return `${value.toFixed(2)}%`;
  }
  if (label === "USDINR") {
    return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
  }
  if (label === "BTC") {
    return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value);
  }
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: value >= 1000 ? 0 : 2 }).format(value);
}

function formatDelta(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function sparklinePoints(values: number[]) {
  if (values.length === 0) return "";
  const high = Math.max(...values);
  const low = Math.min(...values);
  const range = high - low || 1;
  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 44;
      const y = 20 - ((value - low) / range) * 20;
      return `${x},${y}`;
    })
    .join(" ");
}

async function fetchGoldInstrument(signal?: AbortSignal): Promise<SnapshotInstrument | null> {
  const payload = await fetcher<unknown>(`/commodities/search?q=${encodeURIComponent("GOLD")}`, {
    raw: true,
    noRedirectOn401: true,
    cache: "no-store",
    signal,
  });
  const unwrapped = unwrapPayload(payload);
  const candidates = asArray<Record<string, unknown>>(unwrapped).length > 0
    ? asArray<Record<string, unknown>>(unwrapped)
    : [safeRecord(unwrapped)];
  const result = candidates.find((item) => Object.keys(item).length > 0);
  if (!result) return null;

  const price = toNumber(result.price ?? result.ltp ?? result.last_price ?? result.current_price ?? result.close);
  const change = toNumber(result.change ?? result.price_change ?? result.net_change);
  const changePercent = toNumber(
    result.changePercent ??
      result.change_percentage ??
      result.change_percent ??
      result.percent_change ??
      result.netChangePercent ??
      result.dayChangePercent
  );

  return {
    key: "GOLD",
    label: "GOLD",
    price,
    change,
    changePercent,
    sparkline: buildSparkline("GOLD", price, changePercent),
  };
}

export const MarketSnapshotStrip = memo(function MarketSnapshotStrip() {
  const { runtime } = useMarketDomainGraph();
  const [state, setState] = useState<SnapshotState>({
    items: [],
    lastUpdated: null,
    error: null,
  });

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setInterval> | null = null;
    let controller: AbortController | null = null;

    const load = async () => {
      controller?.abort();
      controller = new AbortController();

      try {
        const [quoteMap, gold] = await Promise.all([
          fetchBulkQuotes(INDEX_INSTRUMENTS.map((item) => item.key), {
            signal: controller.signal,
            preservePreviousData: true,
          }),
          fetchGoldInstrument(controller.signal).catch(() => null),
        ]);

        if (!active) return;

        const items: SnapshotInstrument[] = INDEX_INSTRUMENTS.map((instrument) => {
          if (instrument.key === "GOLD" && gold) return gold;
          const quote: TickerQuote | undefined = quoteMap.get(instrument.key);
          const price = quote?.price ?? 0;
          const changePercent = quote?.changePercent ?? 0;
          return {
            key: instrument.key,
            label: instrument.label,
            price,
            change: quote?.change ?? 0,
            changePercent,
            sparkline: buildSparkline(instrument.key, price, changePercent),
          };
        });

        setState({
          items,
          lastUpdated: new Date().toISOString(),
          error: null,
        });
      } catch (error) {
        if (!active || (error instanceof DOMException && error.name === "AbortError")) return;
        setState((current) => ({
          ...current,
          error: toErrorMessage(error),
        }));
      }
    };

    void load();
    timer = setInterval(() => {
      void load();
    }, POLL_INTERVAL_MS);

    return () => {
      active = false;
      if (timer) clearInterval(timer);
      controller?.abort();
    };
  }, []);

  const items = useMemo(() => state.items, [state.items]);

  return (
    <div className="border-b border-white/10 bg-[#05070d]/95 backdrop-blur-xl">
      <div className="flex h-9 items-center gap-3 overflow-x-auto px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${runtime.connected ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}>
          {runtime.connected ? "WS LIVE" : "WS DOWN"}
        </span>
        {items.map((item) => {
          const positive = item.changePercent >= 0;
          return (
            <div
              key={item.key}
              className="flex shrink-0 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1"
            >
              <p className="text-[10px] uppercase tracking-[0.13em] text-slate-400">{item.label}</p>
              <p className="text-xs font-semibold text-white tabular-nums">{formatPrice(item.label, item.price)}</p>
              <p className={`text-[11px] font-semibold tabular-nums ${positive ? "text-emerald-300" : "text-rose-300"}`}>
                {formatDelta(item.changePercent)}
              </p>
              <svg viewBox="0 0 44 20" className="h-4 w-12 overflow-visible">
                <polyline
                  fill="none"
                  stroke={positive ? "rgba(52,211,153,0.9)" : "rgba(251,113,133,0.9)"}
                  strokeWidth="1.8"
                  points={sparklinePoints(item.sparkline)}
                />
              </svg>
            </div>
          );
        })}
        {runtime.replayActive ? <span className="shrink-0 text-[10px] text-sky-300">Replay</span> : null}
        {runtime.staleRuntime ? <span className="shrink-0 text-[10px] text-amber-300">Stale runtime</span> : null}
        {runtime.degradedSources.map((source) => (
          <span key={source} className="shrink-0 text-[10px] text-amber-200">
            {source}
          </span>
        ))}
        {state.lastUpdated ? (
          <span className="ml-auto shrink-0 text-[10px] text-slate-500">
            {new Date(state.lastUpdated).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
          </span>
        ) : null}
      </div>
      {state.error ? <p className="px-3 py-1 text-[11px] text-slate-500">{state.error}</p> : null}
    </div>
  );
});
