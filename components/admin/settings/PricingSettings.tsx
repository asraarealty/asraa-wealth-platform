"use client";

import { useState } from "react";
import SectionCard from "./SectionCard";
import Toggle from "./Toggle";

interface Plan {
  id: string;
  name: string;
  monthlyPrice: number;
  maxClients: number;
  maxAssetsPerClient: number;
  features: string[];
}

interface PricingConfig {
  enableSubscriptions: boolean;
  trialDays: number;
  activePlanId: string;
  plans: Plan[];
}

const defaultPlans: Plan[] = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    maxClients: 5,
    maxAssetsPerClient: 10,
    features: ["Basic portfolio tracking", "Email support", "5 clients"],
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 999,
    maxClients: 50,
    maxAssetsPerClient: 100,
    features: [
      "Full portfolio management",
      "AI insights",
      "50 clients",
      "Priority support",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    monthlyPrice: 2999,
    maxClients: -1,
    maxAssetsPerClient: -1,
    features: [
      "Unlimited clients",
      "Unlimited assets",
      "AI portfolio intelligence",
      "WhatsApp alerts",
      "Dedicated support",
    ],
  },
];

const inputCls =
  "w-full rounded-xl px-3 py-2 text-sm neon-input";

const PLAN_ACCENT: Record<string, { color: string; bg: string; border: string }> = {
  free: { color: "#94a3b8", bg: "rgba(148,163,184,0.06)", border: "rgba(148,163,184,0.15)" },
  pro: { color: "#00E5FF", bg: "rgba(0,229,255,0.06)", border: "rgba(0,229,255,0.15)" },
  premium: { color: "#C9A227", bg: "rgba(201,162,39,0.06)", border: "rgba(201,162,39,0.2)" },
};

export default function PricingSettings() {
  const [config, setConfig] = useState<PricingConfig>({
    enableSubscriptions: true,
    trialDays: 14,
    activePlanId: "pro",
    plans: defaultPlans,
  });

  function patchPlan(planId: string, partial: Partial<Plan>) {
    setConfig((prev) => ({
      ...prev,
      plans: prev.plans.map((p) => (p.id === planId ? { ...p, ...partial } : p)),
    }));
  }

  function patchFeature(planId: string, index: number, value: string) {
    setConfig((prev) => ({
      ...prev,
      plans: prev.plans.map((p) => {
        if (p.id !== planId) return p;
        const features = [...p.features];
        features[index] = value;
        return { ...p, features };
      }),
    }));
  }

  function addFeature(planId: string) {
    setConfig((prev) => ({
      ...prev,
      plans: prev.plans.map((p) =>
        p.id === planId ? { ...p, features: [...p.features, ""] } : p
      ),
    }));
  }

  function removeFeature(planId: string, index: number) {
    setConfig((prev) => ({
      ...prev,
      plans: prev.plans.map((p) => {
        if (p.id !== planId) return p;
        const features = p.features.filter((_, i) => i !== index);
        return { ...p, features };
      }),
    }));
  }

  async function handleSave() {
    await new Promise<void>((resolve) => setTimeout(resolve, 600));
  }

  return (
    <SectionCard
      title="Pricing & Subscription"
      icon={
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5z" />
        </svg>
      }
      onSave={handleSave}
    >
      {/* Global toggles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div
          className="flex items-center justify-between rounded-xl px-4 py-3"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <p className="text-sm font-medium text-white">Enable Subscriptions</p>
          <Toggle
            checked={config.enableSubscriptions}
            onChange={(v) => setConfig((p) => ({ ...p, enableSubscriptions: v }))}
          />
        </div>
        <div
          className="flex flex-col gap-1.5 rounded-xl px-4 py-3"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <label className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>
            Trial Days
          </label>
          <input
            type="number"
            className={inputCls}
            value={config.trialDays}
            min={0}
            max={90}
            onChange={(e) => setConfig((p) => ({ ...p, trialDays: Number(e.target.value) }))}
          />
        </div>
      </div>

      {/* Plan cards */}
      <div className="space-y-4">
        {config.plans.map((plan) => {
          const accent = PLAN_ACCENT[plan.id] ?? PLAN_ACCENT.free;
          const isActive = config.activePlanId === plan.id;
          return (
            <div
              key={plan.id}
              className="rounded-xl p-4 space-y-3 transition-all duration-200"
              style={{
                background: isActive ? accent.bg : "rgba(255,255,255,0.02)",
                border: isActive
                  ? `1px solid ${accent.border}`
                  : "1px solid rgba(255,255,255,0.06)",
              }}
            >
              {/* Plan header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                    style={{
                      color: accent.color,
                      background: accent.bg,
                      border: `1px solid ${accent.border}`,
                    }}
                  >
                    {plan.name}
                  </span>
                  {isActive && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: "rgba(0,255,159,0.1)", color: "#00ff9f", border: "1px solid rgba(0,255,159,0.2)" }}
                    >
                      Active
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setConfig((p) => ({ ...p, activePlanId: plan.id }))}
                  className="text-xs font-medium transition-colors"
                  style={{ color: isActive ? accent.color : "rgba(255,255,255,0.35)" }}
                >
                  {isActive ? "✓ Current" : "Set Active"}
                </button>
              </div>

              {/* Editable fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                    Monthly Price (₹)
                  </label>
                  <input
                    type="number"
                    className={inputCls}
                    value={plan.monthlyPrice}
                    min={0}
                    onChange={(e) => patchPlan(plan.id, { monthlyPrice: Number(e.target.value) })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                    Max Clients (-1 = unlimited)
                  </label>
                  <input
                    type="number"
                    className={inputCls}
                    value={plan.maxClients}
                    onChange={(e) => patchPlan(plan.id, { maxClients: Number(e.target.value) })}
                  />
                </div>
                <div className="flex flex-col gap-1 col-span-2">
                  <label className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                    Max Assets per Client (-1 = unlimited)
                  </label>
                  <input
                    type="number"
                    className={inputCls}
                    value={plan.maxAssetsPerClient}
                    onChange={(e) =>
                      patchPlan(plan.id, { maxAssetsPerClient: Number(e.target.value) })
                    }
                  />
                </div>
              </div>

              {/* Features */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>
                  Features
                </p>
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      className={`${inputCls} flex-1`}
                      value={f}
                      placeholder="Feature description…"
                      onChange={(e) => patchFeature(plan.id, i, e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => removeFeature(plan.id, i)}
                      className="shrink-0 text-xs transition-colors"
                      style={{ color: "rgba(255,77,109,0.7)" }}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addFeature(plan.id)}
                  className="text-xs font-medium flex items-center gap-1 mt-1 transition-colors hover:opacity-80"
                  style={{ color: accent.color }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Add feature
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
