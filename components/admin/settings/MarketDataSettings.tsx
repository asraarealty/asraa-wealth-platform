"use client";

import { useEffect, useState } from "react";
import SectionCard from "./SectionCard";
import Toggle from "./Toggle";
import Input from "@/components/ui/Input";
import { getStockConfig, updateStockConfig, type StockConfig } from "@/lib/api";
import { toErrorMessage } from "@/lib/fetcher";

type DataProvider = "Yahoo" | "AlphaVantage" | "Custom";
type Exchange = "NSE" | "BSE" | "US";
type CurrencyMode = "INR" | "USD" | "Auto";
type RateSource = "manual" | "API";

const selectCls = "w-full rounded-xl px-4 py-3 text-sm neon-input appearance-none";

const DEFAULT_CONFIG: StockConfig = {
  dataProvider: "Yahoo",
  defaultExchange: "NSE",
  autoSymbolSuffix: true,
  currencyMode: "INR",
  exchangeRateSource: "API",
  manualRate: 83.5,
};

export default function MarketDataSettings() {
  const [config, setConfig] = useState<StockConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    getStockConfig(ac.signal)
      .then((data) => setConfig(data))
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(toErrorMessage(err));
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  function patch(partial: Partial<StockConfig>) {
    setConfig((prev) => ({ ...prev, ...partial }));
  }

  async function handleSave() {
    await updateStockConfig(config);
  }

  const suffixPreview =
    config.autoSymbolSuffix && config.defaultExchange === "NSE"
      ? "RELIANCE → RELIANCE.NS"
      : config.autoSymbolSuffix && config.defaultExchange === "BSE"
      ? "RELIANCE → RELIANCE.BO"
      : null;

  return (
    <SectionCard
      title="Stock & Market Data"
      icon={
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 0 1 5.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
        </svg>
      }
      onSave={handleSave}
      loading={loading}
    >
      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: "rgba(255,77,109,0.08)", border: "1px solid rgba(255,77,109,0.2)", color: "#ff4d6d" }}
        >
          {error}
        </div>
      )}

      {/* Data Provider */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
          Data Provider
        </label>
        <select
          className={selectCls}
          value={config.dataProvider}
          onChange={(e) => patch({ dataProvider: e.target.value as DataProvider })}
        >
          <option value="Yahoo">Yahoo Finance</option>
          <option value="AlphaVantage">Alpha Vantage</option>
          <option value="Custom">Custom API</option>
        </select>
      </div>

      {/* Default Exchange */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
          Default Exchange
        </label>
        <select
          className={selectCls}
          value={config.defaultExchange}
          onChange={(e) => patch({ defaultExchange: e.target.value as Exchange })}
        >
          <option value="NSE">NSE — National Stock Exchange</option>
          <option value="BSE">BSE — Bombay Stock Exchange</option>
          <option value="US">US — US Markets</option>
        </select>
      </div>

      {/* Auto Symbol Suffix */}
      <div
        className="rounded-xl px-4 py-3 space-y-2"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">Auto Symbol Suffix</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
              Append exchange suffix to stock symbols
            </p>
          </div>
          <Toggle
            checked={config.autoSymbolSuffix}
            onChange={(v) => patch({ autoSymbolSuffix: v })}
          />
        </div>
        {suffixPreview && (
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
            style={{
              background: "rgba(0,229,255,0.05)",
              border: "1px solid rgba(0,229,255,0.1)",
              color: "#00E5FF",
            }}
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
            </svg>
            Preview: {suffixPreview}
          </div>
        )}
      </div>

      {/* Currency Mode */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
          Currency Mode
        </label>
        <select
          className={selectCls}
          value={config.currencyMode}
          onChange={(e) => patch({ currencyMode: e.target.value as CurrencyMode })}
        >
          <option value="INR">INR — Always Indian Rupee</option>
          <option value="USD">USD — Always US Dollar</option>
          <option value="Auto">Auto — Detect by exchange</option>
        </select>
      </div>

      {/* Exchange Rate */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
          Exchange Rate Source
        </label>
        <div className="flex gap-3">
          {(["API", "manual"] as RateSource[]).map((src) => (
            <button
              key={src}
              type="button"
              onClick={() => patch({ exchangeRateSource: src })}
              className="flex-1 rounded-xl py-2.5 text-sm font-medium transition-all duration-200"
              style={
                config.exchangeRateSource === src
                  ? {
                      background: "rgba(0,229,255,0.1)",
                      border: "1px solid rgba(0,229,255,0.3)",
                      color: "#00E5FF",
                    }
                  : {
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      color: "rgba(255,255,255,0.45)",
                    }
              }
            >
              {src === "API" ? "Live API" : "Manual Rate"}
            </button>
          ))}
        </div>
      </div>

      {/* Manual Rate input */}
      {config.exchangeRateSource === "manual" && (
        <Input
          label="Manual USD → INR Rate"
          type="number"
          value={config.manualRate}
          step={0.01}
          min={1}
          onChange={(e) => patch({ manualRate: Number(e.target.value) })}
          placeholder="e.g. 83.50"
        />
      )}
    </SectionCard>
  );
}
