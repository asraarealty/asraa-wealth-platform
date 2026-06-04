"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { IntelligenceCard, SectionHeader, StatusPill, SurfaceCard } from "@/components/v2/ui";

type Industry = "Restaurant" | "Real Estate" | "Manufacturing";
type BusinessProfile = {
  businessName: string;
  industry: Industry;
  monthlyRevenue: number;
  monthlyExpenses: number;
  employees: number;
  customers: number;
  growthGoal: string;
};

const INDUSTRY_RECOMMENDATIONS: Record<Industry, string[]> = {
  Restaurant: [
    "Reduce food waste",
    "Improve repeat customers",
    "Optimize delivery margins",
  ],
  "Real Estate": [
    "Improve lead conversion",
    "Increase referral network",
    "Strengthen CRM follow-up",
  ],
  Manufacturing: [
    "Improve inventory turnover",
    "Reduce machine downtime",
    "Optimize working capital",
  ],
};

const INDUSTRY_PARTNERS: Record<Industry, Array<{ title: string; detail: string }>> = {
  Restaurant: [
    { title: "Supplier", detail: "Secure inventory terms for fast-moving categories." },
    { title: "Packaging Vendor", detail: "Lower unit packaging cost across takeout orders." },
    { title: "Delivery Partner", detail: "Improve margin visibility across aggregator channels." },
  ],
  Manufacturing: [
    { title: "Distributor", detail: "Expand market reach with regional channel coverage." },
    { title: "Logistics Partner", detail: "Reduce delivery delays and secondary freight costs." },
    { title: "Finance Partner", detail: "Support working-capital cycles and purchase planning." },
  ],
  "Real Estate": [
    { title: "Home Loan Partner", detail: "Increase conversions with faster financing support." },
    { title: "Legal Consultant", detail: "Accelerate documentation and compliance review." },
    { title: "Interior Designer", detail: "Lift buyer confidence for premium inventory." },
  ],
};

const INDUSTRY_NOTES: Record<Industry, string> = {
  Restaurant: "Mock recommendations prioritize unit economics, retention, and delivery efficiency.",
  "Real Estate": "Mock recommendations prioritize pipeline conversion, referrals, and follow-up rigor.",
  Manufacturing: "Mock recommendations prioritize throughput, uptime, and cash-cycle efficiency.",
};

const GOAL_SIGNAL_FULL_THRESHOLD = 24;
const GOAL_SIGNAL_PARTIAL_THRESHOLD = 8;
const GOAL_SIGNAL_FULL_SCORE = 14;
const GOAL_SIGNAL_PARTIAL_SCORE = 8;
const GROWTH_CUSTOMER_DENSITY_MULTIPLIER = 3.5;
const GROWTH_REVENUE_DIVISOR = 30000;
const GROWTH_REVENUE_CAP = 42;
const RISK_EXPENSE_WEIGHT = 62;
const RISK_TEAM_SIZE_THRESHOLD = 40;
const RISK_TEAM_SIZE_PENALTY = 0.7;
const RISK_CUSTOMER_BUFFER_DIVISOR = 40;
const RISK_CUSTOMER_BUFFER_CAP = 18;
const ONBOARDING_STEP_THRESHOLDS = [30, 60, 90] as const;

const DEFAULT_PROFILE: BusinessProfile = {
  businessName: "Asraa Bistro",
  industry: "Restaurant",
  monthlyRevenue: 780000,
  monthlyExpenses: 495000,
  employees: 24,
  customers: 1320,
  growthGoal: "Increase repeat customers and expand catering revenue",
};

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
    notation: value >= 100000 ? "compact" : "standard",
  }).format(value);
}

function getScoreTone(score: number) {
  if (score >= 75) return "success" as const;
  if (score >= 50) return "info" as const;
  if (score >= 35) return "warn" as const;
  return "danger" as const;
}

function MetricBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3">
      <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function ScoreCard({
  label,
  score,
  hint,
}: {
  label: string;
  score: number;
  hint: string;
}) {
  const tone = getScoreTone(score);
  const barColor = {
    success: "bg-emerald-400",
    info: "bg-sky-400",
    warn: "bg-amber-400",
    danger: "bg-rose-400",
  }[tone];

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-white">{score}</p>
        </div>
        <StatusPill
          label={tone === "success" ? "Strong" : tone === "info" ? "Stable" : tone === "warn" ? "Watch" : "Risk"}
          tone={tone}
        />
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-white/10">
        <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${score}%` }} />
      </div>
      <p className="mt-2 text-xs text-slate-400">{hint}</p>
    </div>
  );
}

function FormField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block space-y-2 ${className}`}>
      <span className="text-xs font-medium text-slate-300">{label}</span>
      {children}
    </label>
  );
}

export function BusinessConnectWorkspace() {
  const [profile, setProfile] = useState<BusinessProfile>(DEFAULT_PROFILE);

  const completion = useMemo(() => {
    const fields = [
      profile.businessName,
      profile.industry,
      profile.monthlyRevenue > 0 ? "1" : "",
      profile.monthlyExpenses > 0 ? "1" : "",
      profile.employees > 0 ? "1" : "",
      profile.customers > 0 ? "1" : "",
      profile.growthGoal,
    ];

    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }, [profile]);

  const scores = useMemo(() => {
    const revenue = Math.max(profile.monthlyRevenue, 1);
    const expenseRatio = profile.monthlyExpenses / revenue;
    const customerDensity = profile.customers / Math.max(profile.employees, 1);
    const goalLength = profile.growthGoal.trim().length;
    const goalSignal =
      goalLength >= GOAL_SIGNAL_FULL_THRESHOLD
        ? GOAL_SIGNAL_FULL_SCORE
        : goalLength >= GOAL_SIGNAL_PARTIAL_THRESHOLD
          ? GOAL_SIGNAL_PARTIAL_SCORE
          : 0;

    const profitability = clamp((1 - expenseRatio) * 100);
    // Placeholder growth score: customer density rewards lean team leverage, revenue scale caps oversized
    // businesses from dominating the score, and goal clarity adds a small planning premium until backend
    // scoring replaces these temporary weights.
    const growth = clamp(
      (customerDensity * GROWTH_CUSTOMER_DENSITY_MULTIPLIER) +
      Math.min(profile.monthlyRevenue / GROWTH_REVENUE_DIVISOR, GROWTH_REVENUE_CAP) +
      goalSignal
    );
    const risk = clamp(
      100 -
      (expenseRatio * RISK_EXPENSE_WEIGHT) -
      (Math.max(profile.employees - RISK_TEAM_SIZE_THRESHOLD, 0) * RISK_TEAM_SIZE_PENALTY) +
      Math.min(profile.customers / RISK_CUSTOMER_BUFFER_DIVISOR, RISK_CUSTOMER_BUFFER_CAP)
    );
    const health = clamp((profitability * 0.45) + (growth * 0.3) + (risk * 0.25));

    return {
      health,
      profitability,
      growth,
      risk,
    };
  }, [profile]);

  const opportunities = INDUSTRY_RECOMMENDATIONS[profile.industry];
  const partners = INDUSTRY_PARTNERS[profile.industry];

  return (
    <div className="space-y-5 animate-fade-in">
      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader
          eyebrow="Business Connect"
          title="Business onboarding and operating snapshot"
          subtitle="Frontend-only mock experience using the existing Wealth OS dark operating surface."
          action={<StatusPill label="Mock Mode" tone="info" />}
        />
        <div className="mt-4 grid gap-3 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Onboarding Status</p>
            <h2 className="mt-2 text-lg font-semibold text-white">Business profile readiness</h2>
            <p className="mt-1 text-sm text-slate-400">
              Complete the business profile to unlock placeholder health scoring, industry opportunities, and partner recommendations.
            </p>
            <div className="mt-4 h-2 rounded-full bg-white/10">
              <div className="h-2 rounded-full bg-sky-400" style={{ width: `${completion}%` }} />
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {[
                { title: "Profile", detail: "Core business data captured" },
                { title: "Scoring", detail: "Placeholder health signals generated" },
                { title: "Partners", detail: "Industry-matched recommendations loaded" },
              ].map((step, index) => (
                <div key={step.title} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-white">{step.title}</p>
                    <StatusPill
                      label={completion >= ONBOARDING_STEP_THRESHOLDS[index] ? "Ready" : "Pending"}
                      tone={completion >= ONBOARDING_STEP_THRESHOLDS[index] ? "success" : "warn"}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">{step.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-sky-400/20 bg-sky-500/[0.06] p-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-sky-200/70">Current Focus</p>
            <p className="mt-2 text-base font-semibold text-white">{profile.businessName || "New business profile"}</p>
            <p className="mt-1 text-sm text-slate-300">{profile.industry}</p>
            <p className="mt-4 text-xs text-slate-300">Growth Goal</p>
            <p className="mt-1 text-sm text-white">{profile.growthGoal || "Set a growth objective to tailor the dashboard."}</p>
            <p className="mt-4 text-xs text-slate-400">{INDUSTRY_NOTES[profile.industry]}</p>
          </div>
        </div>
      </SurfaceCard>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <SurfaceCard className="p-4 sm:p-5">
          <SectionHeader
            eyebrow="Business Profile Form"
            title="Capture core business inputs"
            subtitle="All values are stored in local state until backend support is available."
          />
          <form className="mt-4 grid gap-4 sm:grid-cols-2" onSubmit={(event) => event.preventDefault()}>
            <FormField label="Business Name">
              <input
                value={profile.businessName}
                onChange={(event) => setProfile((current) => ({ ...current, businessName: event.target.value }))}
                className="v2-input w-full"
                placeholder="Enter business name"
              />
            </FormField>

            <FormField label="Industry">
              <select
                value={profile.industry}
                onChange={(event) => setProfile((current) => ({ ...current, industry: event.target.value as Industry }))}
                className="v2-select w-full"
              >
                {Object.keys(INDUSTRY_RECOMMENDATIONS).map((industry) => (
                  <option key={industry} value={industry}>{industry}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Monthly Revenue">
              <input
                type="number"
                min="0"
                value={profile.monthlyRevenue}
                onChange={(event) => setProfile((current) => ({ ...current, monthlyRevenue: Number(event.target.value) || 0 }))}
                className="v2-input w-full"
              />
            </FormField>

            <FormField label="Monthly Expenses">
              <input
                type="number"
                min="0"
                value={profile.monthlyExpenses}
                onChange={(event) => setProfile((current) => ({ ...current, monthlyExpenses: Number(event.target.value) || 0 }))}
                className="v2-input w-full"
              />
            </FormField>

            <FormField label="Employees">
              <input
                type="number"
                min="0"
                value={profile.employees}
                onChange={(event) => setProfile((current) => ({ ...current, employees: Number(event.target.value) || 0 }))}
                className="v2-input w-full"
              />
            </FormField>

            <FormField label="Customers">
              <input
                type="number"
                min="0"
                value={profile.customers}
                onChange={(event) => setProfile((current) => ({ ...current, customers: Number(event.target.value) || 0 }))}
                className="v2-input w-full"
              />
            </FormField>

            <FormField label="Growth Goal" className="sm:col-span-2">
              <textarea
                value={profile.growthGoal}
                onChange={(event) => setProfile((current) => ({ ...current, growthGoal: event.target.value }))}
                className="min-h-28 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500"
                placeholder="Describe the next business growth objective"
              />
            </FormField>
          </form>
        </SurfaceCard>

        <SurfaceCard className="p-4 sm:p-5">
          <SectionHeader
            eyebrow="Business Connect Dashboard"
            title="Business operating snapshot"
            subtitle="Business inputs reflected immediately in a lightweight dashboard."
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MetricBlock label="Business Name" value={profile.businessName || "—"} />
            <MetricBlock label="Industry" value={profile.industry} />
            <MetricBlock label="Revenue" value={formatCurrency(profile.monthlyRevenue)} />
            <MetricBlock label="Expenses" value={formatCurrency(profile.monthlyExpenses)} />
            <MetricBlock label="Employees" value={profile.employees.toLocaleString("en-IN")} />
            <MetricBlock label="Customers" value={profile.customers.toLocaleString("en-IN")} />
            <div className="sm:col-span-2">
              <MetricBlock label="Growth Goal" value={profile.growthGoal || "—"} />
            </div>
          </div>
        </SurfaceCard>
      </div>

      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader
          eyebrow="Business Health Card"
          title="Placeholder business scoring"
          subtitle="Scores are frontend mock calculations and can later be replaced with backend-authoritative scoring."
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ScoreCard label="Business Health Score" score={scores.health} hint="Weighted blend of profitability, growth readiness, and risk resilience." />
          <ScoreCard label="Profitability Score" score={scores.profitability} hint="Higher score reflects stronger revenue retention after expenses." />
          <ScoreCard label="Growth Score" score={scores.growth} hint="Based on customer scale, employee leverage, and growth-goal clarity." />
          <ScoreCard label="Risk Score" score={scores.risk} hint="Higher score reflects better operating cushion and lower cost pressure." />
        </div>
      </SurfaceCard>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <SurfaceCard className="p-4 sm:p-5">
          <SectionHeader
            eyebrow="Opportunity Section"
            title="Top opportunities"
            subtitle={`Top 3 recommendation set for ${profile.industry}.`}
          />
          <div className="mt-4 space-y-3">
            {opportunities.map((item, index) => (
              <IntelligenceCard
                key={item}
                title={`Recommendation ${index + 1}`}
                message={item}
                tone={index === 0 ? "success" : "info"}
              />
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-4 sm:p-5">
          <SectionHeader
            eyebrow="Recommended Partners Section"
            title="Industry-specific partners"
            subtitle="Suggested partner categories aligned to the selected business model."
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            {partners.map((partner) => (
              <div key={partner.title} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{partner.title}</p>
                  <StatusPill label={profile.industry} tone="info" />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">{partner.detail}</p>
              </div>
            ))}
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
