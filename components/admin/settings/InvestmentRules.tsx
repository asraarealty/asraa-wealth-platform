"use client";

import { useState } from "react";
import SectionCard from "./SectionCard";

type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
type RebalanceFrequency = "monthly" | "quarterly";

interface AllocationProfile {
  stocks: number;
  mutualFunds: number;
  realEstate: number;
}

interface InvestmentConfig {
  profiles: Record<RiskLevel, AllocationProfile>;
  maxStockAllocation: number;
  rebalanceFrequency: RebalanceFrequency;
}

const RISK_ACCENT: Record<RiskLevel, { color: string; bg: string; border: string }> = {
  LOW: { color: "#00ff9f", bg: "rgba(0,255,159,0.06)", border: "rgba(0,255,159,0.15)" },
  MEDIUM: { color: "#C9A227", bg: "rgba(201,162,39,0.06)", border: "rgba(201,162,39,0.15)" },
  HIGH: { color: "#ff4d6d", bg: "rgba(255,77,109,0.06)", border: "rgba(255,77,109,0.15)" },
};

const selectCls = "w-full rounded-xl px-4 py-3 text-sm neon-input appearance-none";
const inputCls = "w-full rounded-xl px-3 py-2.5 text-sm neon-input";

function AllocationRow({
  label,
  value,
  onChange,
  total,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  total: number;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span
        className="text-xs font-medium w-28 shrink-0"
        style={{ color: "rgba(255,255,255,0.6)" }}
      >
        {label}
      </span>
      <div className="flex-1 relative">
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(pct, 100)}%`,
              background: "linear-gradient(90deg, #00E5FF, #4F8CFF)",
            }}
          />
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <input
          type="number"
          className="w-16 rounded-lg px-2 py-1 text-sm text-center neon-input"
          value={value}
          min={0}
          max={100}
          onChange={(e) => onChange(Math.max(0, Math.min(100, Number(e.target.value))))}
        />
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>%</span>
      </div>
    </div>
  );
}

export default function InvestmentRules() {
  const [config, setConfig] = useState<InvestmentConfig>({
    profiles: {
      LOW: { stocks: 20, mutualFunds: 50, realEstate: 30 },
      MEDIUM: { stocks: 40, mutualFunds: 40, realEstate: 20 },
      HIGH: { stocks: 70, mutualFunds: 20, realEstate: 10 },
    },
    maxStockAllocation: 75,
    rebalanceFrequency: "quarterly",
  });

  function patchProfile(level: RiskLevel, partial: Partial<AllocationProfile>) {
    setConfig((prev) => ({
      ...prev,
      profiles: {
        ...prev.profiles,
        [level]: { ...prev.profiles[level], ...partial },
      },
    }));
  }

  function getTotal(profile: AllocationProfile) {
    return profile.stocks + profile.mutualFunds + profile.realEstate;
  }

  async function handleSave() {
    // Validate all profiles sum to 100 before saving
    for (const level of Object.keys(config.profiles) as RiskLevel[]) {
      if (getTotal(config.profiles[level]) !== 100) {
        throw new Error(`${level} profile must sum to 100%`);
      }
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 600));
  }

  return (
    <SectionCard
      title="Investment Rules — Allocation Engine"
      icon={
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      }
      onSave={handleSave}
    >
      {/* Risk profile cards */}
      <div className="space-y-4">
        {(["LOW", "MEDIUM", "HIGH"] as RiskLevel[]).map((level) => {
          const profile = config.profiles[level];
          const total = getTotal(profile);
          const accent = RISK_ACCENT[level];
          const isValid = total === 100;

          return (
            <div
              key={level}
              className="rounded-xl p-4 space-y-3"
              style={{ background: accent.bg, border: `1px solid ${accent.border}` }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                  style={{ color: accent.color, background: accent.bg, border: `1px solid ${accent.border}` }}
                >
                  {level} Risk
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-semibold"
                    style={{ color: isValid ? "#00ff9f" : "#ff4d6d" }}
                  >
                    Total: {total}%
                  </span>
                  {!isValid && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: "rgba(255,77,109,0.12)",
                        color: "#ff4d6d",
                        border: "1px solid rgba(255,77,109,0.2)",
                      }}
                    >
                      ⚠ Must equal 100%
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2.5 pt-1">
                <AllocationRow
                  label="Stocks"
                  value={profile.stocks}
                  onChange={(v) => patchProfile(level, { stocks: v })}
                  total={total}
                />
                <AllocationRow
                  label="Mutual Funds"
                  value={profile.mutualFunds}
                  onChange={(v) => patchProfile(level, { mutualFunds: v })}
                  total={total}
                />
                <AllocationRow
                  label="Real Estate"
                  value={profile.realEstate}
                  onChange={(v) => patchProfile(level, { realEstate: v })}
                  total={total}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Advanced settings */}
      <div
        className="rounded-xl p-4 space-y-3"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>
          Advanced
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
              Max Stock Allocation (%)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={10}
                max={100}
                step={5}
                value={config.maxStockAllocation}
                onChange={(e) =>
                  setConfig((p) => ({ ...p, maxStockAllocation: Number(e.target.value) }))
                }
                className="flex-1 accent-cyan-400"
              />
              <span
                className="text-sm font-semibold w-10 text-right"
                style={{ color: "#00E5FF" }}
              >
                {config.maxStockAllocation}%
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
              Rebalance Frequency
            </label>
            <select
              className={`${selectCls}`}
              value={config.rebalanceFrequency}
              onChange={(e) =>
                setConfig((p) => ({
                  ...p,
                  rebalanceFrequency: e.target.value as RebalanceFrequency,
                }))
              }
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
