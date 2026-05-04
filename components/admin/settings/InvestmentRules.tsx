"use client";

import { useEffect, useState } from "react";
import SectionCard from "./SectionCard";
import {
  getAllocationRules,
  updateAllocationRules,
  type AllocationRules,
  type AllocationProfile,
} from "@/lib/api";
import { toErrorMessage } from "@/lib/fetcher";

type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

const RISK_ACCENT: Record<RiskLevel, { color: string; bg: string; border: string }> = {
  LOW: { color: "#00ff9f", bg: "rgba(0,255,159,0.06)", border: "rgba(0,255,159,0.15)" },
  MEDIUM: { color: "#C9A227", bg: "rgba(201,162,39,0.06)", border: "rgba(201,162,39,0.15)" },
  HIGH: { color: "#ff4d6d", bg: "rgba(255,77,109,0.06)", border: "rgba(255,77,109,0.15)" },
};

const DEFAULT_RULES: AllocationRules = {
  LOW: { stocksPercent: 20, mutualFundsPercent: 50, realEstatePercent: 30 },
  MEDIUM: { stocksPercent: 40, mutualFundsPercent: 40, realEstatePercent: 20 },
  HIGH: { stocksPercent: 70, mutualFundsPercent: 20, realEstatePercent: 10 },
};

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
  const [rules, setRules] = useState<AllocationRules>(DEFAULT_RULES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    getAllocationRules(ac.signal)
      .then((data) => {
        if (data) {
          setRules({
            LOW: { ...DEFAULT_RULES.LOW, ...(data.LOW ?? {}) },
            MEDIUM: { ...DEFAULT_RULES.MEDIUM, ...(data.MEDIUM ?? {}) },
            HIGH: { ...DEFAULT_RULES.HIGH, ...(data.HIGH ?? {}) },
          });
        } else {
          console.warn("getAllocationRules: received null/empty response");
        }
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(toErrorMessage(err));
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  function patchProfile(level: RiskLevel, partial: Partial<AllocationProfile>) {
    setRules((prev) => ({
      ...prev,
      [level]: { ...prev[level], ...partial },
    }));
  }

  function getTotal(profile: AllocationProfile) {
    return profile.stocksPercent + profile.mutualFundsPercent + profile.realEstatePercent;
  }

  async function handleSave() {
    for (const level of Object.keys(rules) as RiskLevel[]) {
      if (getTotal(rules[level]) !== 100) {
        throw new Error(`${level} profile must sum to 100%`);
      }
    }
    await updateAllocationRules(rules);
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

      {/* Risk profile cards */}
      <div className="space-y-4">
        {(["LOW", "MEDIUM", "HIGH"] as RiskLevel[]).map((level) => {
          const profile = rules[level];
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
                  value={profile.stocksPercent}
                  onChange={(v) => patchProfile(level, { stocksPercent: v })}
                  total={total}
                />
                <AllocationRow
                  label="Mutual Funds"
                  value={profile.mutualFundsPercent}
                  onChange={(v) => patchProfile(level, { mutualFundsPercent: v })}
                  total={total}
                />
                <AllocationRow
                  label="Real Estate"
                  value={profile.realEstatePercent}
                  onChange={(v) => patchProfile(level, { realEstatePercent: v })}
                  total={total}
                />
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
