"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toErrorMessage } from "@/lib/fetcher";
import {
  createClient,
  createClientProfile,
  type InvestmentHorizon,
  type GoalKey,
  type RiskLevel,
} from "@/lib/services/clientService";

// ── Types ────────────────────────────────────────────────────────────────────

interface BasicInfo {
  name: string;
  email: string;
  phone: string;
}

interface FinancialProfile {
  monthlyIncome: string;
  investmentCapacity: string;
  investmentHorizon: InvestmentHorizon | "";
}

type RiskAnswer = "sell" | "hold" | "invest_more" | "";

interface FormState {
  basic: BasicInfo;
  financial: FinancialProfile;
  riskAnswer: RiskAnswer;
  goals: GoalKey[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function computeRiskLevel(answer: RiskAnswer): RiskLevel | null {
  if (answer === "sell") return "LOW";
  if (answer === "invest_more") return "HIGH";
  if (answer === "hold") return "MEDIUM";
  return null;
}

function computeStrategy(risk: RiskLevel): string {
  if (risk === "LOW") return "Conservative";
  if (risk === "HIGH") return "Aggressive";
  return "Balanced";
}

function computeAllocation(risk: RiskLevel) {
  if (risk === "LOW") return { stocks: 20, mf: 40, realEstate: 40 };
  if (risk === "HIGH") return { stocks: 60, mf: 30, realEstate: 10 };
  return { stocks: 40, mf: 40, realEstate: 20 };
}

const HORIZON_OPTIONS: { value: InvestmentHorizon; label: string }[] = [
  { value: "<1y", label: "Less than 1 year" },
  { value: "1-3y", label: "1 – 3 years" },
  { value: "3-5y", label: "3 – 5 years" },
  { value: "5y+", label: "5+ years" },
];

const GOAL_OPTIONS: { key: GoalKey; label: string; emoji: string }[] = [
  { key: "wealth_growth", label: "Wealth Growth", emoji: "📈" },
  { key: "passive_income", label: "Passive Income", emoji: "💰" },
  { key: "retirement", label: "Retirement Planning", emoji: "🏖️" },
  { key: "property_purchase", label: "Property Purchase", emoji: "🏠" },
];

const RISK_OPTIONS: { value: RiskAnswer; label: string; sublabel: string; riskLevel: RiskLevel }[] = [
  { value: "sell", label: "Sell immediately", sublabel: "Cut losses fast", riskLevel: "LOW" },
  { value: "hold", label: "Hold and wait", sublabel: "Stay the course", riskLevel: "MEDIUM" },
  { value: "invest_more", label: "Buy the dip", sublabel: "Opportunity knocks", riskLevel: "HIGH" },
];

const STEP_LABELS = [
  "Basic Info",
  "Financial Profile",
  "Risk Assessment",
  "Goals",
  "Review",
];

// ── Small shared components ───────────────────────────────────────────────────

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="flex items-center gap-1.5 text-xs mt-1" style={{ color: "#ff4d6d" }}>
      <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-.75-4.75a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-1.5 0v4.5Zm.75-7.25a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
      </svg>
      {msg}
    </p>
  );
}

function NeonInput({
  label,
  required,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; required?: boolean; error?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.6)" }}>
        {label}
        {required && <span className="ml-1" style={{ color: "#00E5FF" }}>*</span>}
      </label>
      <input
        {...props}
        className="w-full neon-input rounded-xl px-4 py-3 text-sm text-white"
        style={{ outline: "none" }}
      />
      <FieldError msg={error} />
    </div>
  );
}

// ── Stepper indicator ─────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEP_LABELS.map((label, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 shrink-0"
                style={
                  done
                    ? { background: "linear-gradient(135deg,#00E5FF,#4F8CFF)", color: "#020912" }
                    : active
                    ? { background: "linear-gradient(135deg,#00E5FF,#4F8CFF)", color: "#020912", boxShadow: "0 0 20px rgba(0,229,255,0.45)" }
                    : { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.1)" }
                }
              >
                {done ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step
                )}
              </div>
              <span
                className="text-[10px] font-medium hidden sm:block whitespace-nowrap"
                style={{ color: active ? "#00E5FF" : done ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.25)" }}
              >
                {label}
              </span>
            </div>
            {step < total && (
              <div
                className="flex-1 h-px mx-2 mb-4 sm:mb-5 transition-all duration-500"
                style={{
                  background: step < current
                    ? "linear-gradient(90deg,#00E5FF,#4F8CFF)"
                    : "rgba(255,255,255,0.08)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Live Summary Panel ────────────────────────────────────────────────────────

function LiveSummary({ form }: { form: FormState }) {
  const risk = computeRiskLevel(form.riskAnswer);
  const strategy = risk ? computeStrategy(risk) : null;
  const allocation = risk ? computeAllocation(risk) : null;

  const riskColor = risk === "LOW" ? "#00ff9f" : risk === "HIGH" ? "#ff4d6d" : "#00E5FF";
  const riskBg = risk === "LOW" ? "rgba(0,255,159,0.08)" : risk === "HIGH" ? "rgba(255,77,109,0.08)" : "rgba(0,229,255,0.08)";

  return (
    <div
      className="glass-card rounded-2xl p-5 flex flex-col gap-4 sticky top-6"
      style={{ border: "1px solid rgba(0,229,255,0.1)" }}
    >
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: "rgba(0,229,255,0.5)" }}>
          Live Preview
        </p>

        {/* Client name */}
        {form.basic.name ? (
          <div className="flex items-center gap-2.5 mb-4">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
              style={{ background: "rgba(201,162,39,0.15)", color: "#C9A227", border: "1px solid rgba(201,162,39,0.2)" }}
            >
              {form.basic.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{form.basic.name}</p>
              {form.basic.email && <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{form.basic.email}</p>}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-10 h-10 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }} />
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>Fill in basic info…</p>
          </div>
        )}
      </div>

      {/* Risk Level */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>Risk Level</p>
        {risk ? (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ background: riskBg, color: riskColor, border: `1px solid ${riskColor}30` }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: riskColor }} />
            {risk}
          </span>
        ) : (
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>Complete step 3</p>
        )}
      </div>

      {/* Strategy */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>Strategy</p>
        {strategy ? (
          <p className="text-sm font-semibold text-white">{strategy}</p>
        ) : (
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>—</p>
        )}
      </div>

      {/* Allocation */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>Suggested Allocation</p>
        {allocation ? (
          <div className="space-y-2">
            {[
              { label: "Stocks", value: allocation.stocks, color: "#00E5FF" },
              { label: "Mutual Funds", value: allocation.mf, color: "#4F8CFF" },
              { label: "Real Estate", value: allocation.realEstate, color: "#C9A227" },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>{label}</span>
                  <span className="font-semibold" style={{ color }}>{value}%</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div
                    className="h-1.5 rounded-full transition-all duration-700"
                    style={{ width: `${value}%`, background: color }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>—</p>
        )}
      </div>

      {/* Goals */}
      {form.goals.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>Goals</p>
          <div className="flex flex-wrap gap-1.5">
            {form.goals.map((g) => {
              const opt = GOAL_OPTIONS.find((o) => o.key === g);
              return (
                <span
                  key={g}
                  className="text-[11px] px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(79,140,255,0.12)", color: "#4F8CFF", border: "1px solid rgba(79,140,255,0.2)" }}
                >
                  {opt?.emoji} {opt?.label}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Financial snapshot */}
      {(form.financial.monthlyIncome || form.financial.investmentCapacity) && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>Financial</p>
          <div className="space-y-1">
            {form.financial.monthlyIncome && (
              <div className="flex justify-between text-xs">
                <span style={{ color: "rgba(255,255,255,0.4)" }}>Monthly Income</span>
                <span className="font-medium text-white">₹{Number(form.financial.monthlyIncome).toLocaleString("en-IN")}</span>
              </div>
            )}
            {form.financial.investmentCapacity && (
              <div className="flex justify-between text-xs">
                <span style={{ color: "rgba(255,255,255,0.4)" }}>Invest Capacity</span>
                <span className="font-medium text-white">₹{Number(form.financial.investmentCapacity).toLocaleString("en-IN")}</span>
              </div>
            )}
            {form.financial.investmentHorizon && (
              <div className="flex justify-between text-xs">
                <span style={{ color: "rgba(255,255,255,0.4)" }}>Horizon</span>
                <span className="font-medium text-white">{form.financial.investmentHorizon}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Step panels ──────────────────────────────────────────────────────────────

function Step1({
  data,
  errors,
  onChange,
}: {
  data: BasicInfo;
  errors: Partial<BasicInfo>;
  onChange: (key: keyof BasicInfo, val: string) => void;
}) {
  return (
    <div className="space-y-5 animate-slide-up">
      <div>
        <h2 className="text-xl font-bold text-white">Basic Information</h2>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
          Start with the client's core contact details.
        </p>
      </div>
      <NeonInput
        label="Full Name"
        required
        type="text"
        placeholder="e.g. Priya Sharma"
        value={data.name}
        onChange={(e) => onChange("name", e.target.value)}
        error={errors.name}
      />
      <NeonInput
        label="Email Address"
        required
        type="email"
        placeholder="priya@example.com"
        value={data.email}
        onChange={(e) => onChange("email", e.target.value)}
        error={errors.email}
      />
      <NeonInput
        label="Phone Number"
        required
        type="tel"
        placeholder="10–15 digit number"
        value={data.phone}
        onChange={(e) => onChange("phone", e.target.value)}
        error={errors.phone}
      />
    </div>
  );
}

function Step2({
  data,
  errors,
  onChange,
}: {
  data: FinancialProfile;
  errors: Partial<Record<keyof FinancialProfile, string>>;
  onChange: (key: keyof FinancialProfile, val: string) => void;
}) {
  return (
    <div className="space-y-5 animate-slide-up">
      <div>
        <h2 className="text-xl font-bold text-white">Financial Profile</h2>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
          Help us understand the client's financial capacity.
        </p>
      </div>
      <NeonInput
        label="Monthly Income (₹)"
        type="number"
        min="0"
        placeholder="e.g. 150000"
        value={data.monthlyIncome}
        onChange={(e) => onChange("monthlyIncome", e.target.value)}
        error={errors.monthlyIncome}
      />
      <NeonInput
        label="Investment Capacity per Month (₹)"
        type="number"
        min="0"
        placeholder="e.g. 30000"
        value={data.investmentCapacity}
        onChange={(e) => onChange("investmentCapacity", e.target.value)}
        error={errors.investmentCapacity}
      />
      <div>
        <label className="block text-sm font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.6)" }}>
          Investment Horizon
        </label>
        <select
          value={data.investmentHorizon}
          onChange={(e) => onChange("investmentHorizon", e.target.value)}
          className="w-full neon-input rounded-xl px-4 py-3 text-sm text-white"
          style={{ outline: "none", appearance: "none", backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.4)' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center" }}
        >
          <option value="" style={{ background: "#050b18" }}>Select horizon…</option>
          {HORIZON_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} style={{ background: "#050b18" }}>
              {o.label}
            </option>
          ))}
        </select>
        <FieldError msg={errors.investmentHorizon} />
      </div>
    </div>
  );
}

function Step3({
  value,
  error,
  onChange,
}: {
  value: RiskAnswer;
  error?: string;
  onChange: (v: RiskAnswer) => void;
}) {
  return (
    <div className="space-y-5 animate-slide-up">
      <div>
        <h2 className="text-xl font-bold text-white">Risk Assessment</h2>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
          Understanding your client's risk tolerance.
        </p>
      </div>
      <div
        className="p-4 rounded-2xl"
        style={{ background: "rgba(0,229,255,0.04)", border: "1px solid rgba(0,229,255,0.1)" }}
      >
        <p className="text-sm font-medium text-white">
          If the client's portfolio drops 20%, what would they do?
        </p>
      </div>
      <div className="space-y-3">
        {RISK_OPTIONS.map((opt) => {
          const selected = value === opt.value;
          const riskColor = opt.riskLevel === "LOW" ? "#00ff9f" : opt.riskLevel === "HIGH" ? "#ff4d6d" : "#00E5FF";
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className="w-full text-left p-4 rounded-2xl transition-all duration-200 flex items-center justify-between gap-4"
              style={
                selected
                  ? { background: "rgba(0,229,255,0.07)", border: "1px solid rgba(0,229,255,0.35)", boxShadow: "0 0 20px rgba(0,229,255,0.08)" }
                  : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }
              }
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                  style={selected ? { borderColor: "#00E5FF", background: "#00E5FF" } : { borderColor: "rgba(255,255,255,0.25)" }}
                >
                  {selected && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{opt.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{opt.sublabel}</p>
                </div>
              </div>
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                style={{ color: riskColor, background: `${riskColor}15`, border: `1px solid ${riskColor}30` }}
              >
                {opt.riskLevel}
              </span>
            </button>
          );
        })}
      </div>
      <FieldError msg={error} />
    </div>
  );
}

function Step4({
  selected,
  error,
  onChange,
}: {
  selected: GoalKey[];
  error?: string;
  onChange: (goals: GoalKey[]) => void;
}) {
  const toggle = (key: GoalKey) => {
    onChange(selected.includes(key) ? selected.filter((g) => g !== key) : [...selected, key]);
  };

  return (
    <div className="space-y-5 animate-slide-up">
      <div>
        <h2 className="text-xl font-bold text-white">Investment Goals</h2>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
          Select all goals that apply to this client.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {GOAL_OPTIONS.map((opt) => {
          const active = selected.includes(opt.key);
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => toggle(opt.key)}
              className="flex items-center gap-3 p-4 rounded-2xl text-left transition-all duration-200"
              style={
                active
                  ? { background: "rgba(79,140,255,0.1)", border: "1px solid rgba(79,140,255,0.35)", boxShadow: "0 0 16px rgba(79,140,255,0.08)" }
                  : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }
              }
            >
              <span className="text-2xl">{opt.emoji}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">{opt.label}</p>
              </div>
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all"
                style={active ? { background: "#4F8CFF" } : { border: "1px solid rgba(255,255,255,0.2)" }}
              >
                {active && (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </button>
          );
        })}
      </div>
      <FieldError msg={error} />
    </div>
  );
}

function Step5({ form }: { form: FormState }) {
  const risk = computeRiskLevel(form.riskAnswer);
  const strategy = risk ? computeStrategy(risk) : "—";
  const allocation = risk ? computeAllocation(risk) : { stocks: 0, mf: 0, realEstate: 0 };

  const riskColor = risk === "LOW" ? "#00ff9f" : risk === "HIGH" ? "#ff4d6d" : "#00E5FF";

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div
      className="p-4 rounded-2xl space-y-3"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "rgba(0,229,255,0.5)" }}>
        {title}
      </p>
      {children}
    </div>
  );

  const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex justify-between items-center text-sm">
      <span style={{ color: "rgba(255,255,255,0.45)" }}>{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );

  return (
    <div className="space-y-5 animate-slide-up">
      <div>
        <h2 className="text-xl font-bold text-white">Review & Confirm</h2>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
          Verify all details before creating the client profile.
        </p>
      </div>

      <Section title="Basic Info">
        <Row label="Name" value={form.basic.name} />
        <Row label="Email" value={form.basic.email} />
        <Row label="Phone" value={form.basic.phone || "—"} />
      </Section>

      <Section title="Financial Profile">
        <Row
          label="Monthly Income"
          value={form.financial.monthlyIncome ? `₹${Number(form.financial.monthlyIncome).toLocaleString("en-IN")}` : "—"}
        />
        <Row
          label="Investment Capacity"
          value={form.financial.investmentCapacity ? `₹${Number(form.financial.investmentCapacity).toLocaleString("en-IN")}` : "—"}
        />
        <Row label="Horizon" value={form.financial.investmentHorizon || "—"} />
      </Section>

      <Section title="Risk Profile">
        <div className="flex items-center justify-between text-sm">
          <span style={{ color: "rgba(255,255,255,0.45)" }}>Risk Level</span>
          {risk ? (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold"
              style={{ color: riskColor, background: `${riskColor}15`, border: `1px solid ${riskColor}30` }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: riskColor }} />
              {risk}
            </span>
          ) : "—"}
        </div>
        <Row label="Strategy" value={strategy} />
      </Section>

      <Section title="Suggested Allocation">
        <div className="space-y-2">
          {[
            { label: "Stocks", value: allocation.stocks, color: "#00E5FF" },
            { label: "Mutual Funds", value: allocation.mf, color: "#4F8CFF" },
            { label: "Real Estate", value: allocation.realEstate, color: "#C9A227" },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div className="flex justify-between text-xs mb-1">
                <span style={{ color: "rgba(255,255,255,0.45)" }}>{label}</span>
                <span className="font-semibold" style={{ color }}>{value}%</span>
              </div>
              <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div
                  className="h-1.5 rounded-full"
                  style={{ width: `${value}%`, background: color }}
                />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {form.goals.length > 0 && (
        <Section title="Goals">
          <div className="flex flex-wrap gap-2">
            {form.goals.map((g) => {
              const opt = GOAL_OPTIONS.find((o) => o.key === g)!;
              return (
                <span
                  key={g}
                  className="text-xs px-3 py-1 rounded-full flex items-center gap-1.5"
                  style={{ background: "rgba(79,140,255,0.1)", color: "#4F8CFF", border: "1px solid rgba(79,140,255,0.2)" }}
                >
                  {opt.emoji} {opt.label}
                </span>
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
}

// ── Validation ────────────────────────────────────────────────────────────────

function validateStep1(data: BasicInfo): Partial<BasicInfo> {
  const errs: Partial<BasicInfo> = {};
  if (!data.name || data.name.trim().length < 2) errs.name = "Name must be at least 2 characters";
  if (!/^\S+@\S+\.\S+$/.test(data.email.trim())) errs.email = "Enter a valid email address";
  if (!data.phone || !/^\d{10,15}$/.test(data.phone.trim())) errs.phone = "Enter a valid phone (10–15 digits)";
  return errs;
}

function validateStep2(_data: FinancialProfile): Partial<Record<keyof FinancialProfile, string>> {
  return {};
}

function validateStep3(answer: RiskAnswer): string | undefined {
  if (!answer) return "Please select an option to continue";
  return undefined;
}

function validateStep4(goals: GoalKey[]): string | undefined {
  if (goals.length === 0) return "Select at least one goal";
  return undefined;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function NewClientPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    basic: { name: "", email: "", phone: "" },
    financial: { monthlyIncome: "", investmentCapacity: "", investmentHorizon: "" },
    riskAnswer: "",
    goals: [],
  });

  const [step1Errors, setStep1Errors] = useState<Partial<BasicInfo>>({});
  const [step2Errors, setStep2Errors] = useState<Partial<Record<keyof FinancialProfile, string>>>({});
  const [step3Error, setStep3Error] = useState<string | undefined>();
  const [step4Error, setStep4Error] = useState<string | undefined>();

  // ── Field updaters ─────────────────────────────────────────────

  const updateBasic = (key: keyof BasicInfo, val: string) => {
    setForm((f) => ({ ...f, basic: { ...f.basic, [key]: val } }));
    if (step1Errors[key]) setStep1Errors((e) => ({ ...e, [key]: undefined }));
  };

  const updateFinancial = (key: keyof FinancialProfile, val: string) => {
    setForm((f) => ({ ...f, financial: { ...f.financial, [key]: val } }));
    if (step2Errors[key]) setStep2Errors((e) => ({ ...e, [key]: undefined }));
  };

  const updateRisk = (val: RiskAnswer) => {
    setForm((f) => ({ ...f, riskAnswer: val }));
    setStep3Error(undefined);
  };

  const updateGoals = (goals: GoalKey[]) => {
    setForm((f) => ({ ...f, goals }));
    setStep4Error(undefined);
  };

  // ── Navigation ──────────────────────────────────────────────────

  const goNext = () => {
    if (step === 1) {
      const errs = validateStep1(form.basic);
      if (Object.keys(errs).length > 0) { setStep1Errors(errs); return; }
    }
    if (step === 2) {
      const errs = validateStep2(form.financial);
      if (Object.keys(errs).length > 0) { setStep2Errors(errs); return; }
    }
    if (step === 3) {
      const err = validateStep3(form.riskAnswer);
      if (err) { setStep3Error(err); return; }
    }
    if (step === 4) {
      const err = validateStep4(form.goals);
      if (err) { setStep4Error(err); return; }
    }
    setStep((s) => Math.min(s + 1, 5));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 1));

  // ── Submit ──────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);

    try {
      const client = await createClient({
        name: form.basic.name.trim(),
        email: form.basic.email.trim(),
        phone: form.basic.phone.trim() || undefined,
      });

      const risk = computeRiskLevel(form.riskAnswer);

      await createClientProfile(client.id, {
        monthlyIncome: form.financial.monthlyIncome ? Number(form.financial.monthlyIncome) : undefined,
        investmentCapacity: form.financial.investmentCapacity ? Number(form.financial.investmentCapacity) : undefined,
        investmentHorizon: (form.financial.investmentHorizon as InvestmentHorizon) || undefined,
        riskLevel: risk ?? undefined,
        goals: form.goals.length > 0 ? form.goals : undefined,
      }).catch(() => {
        // Profile endpoint may not be live yet — don't block the redirect
      });

      router.push(`/admin/portfolio?clientId=${client.id}`);
    } catch (err) {
      setSubmitError(toErrorMessage(err));
      setSubmitting(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="text-white">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ background: "linear-gradient(90deg,#00E5FF,#4F8CFF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          New Client Onboarding
        </h1>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
          Complete all steps to create a comprehensive client profile.
        </p>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 items-start">
        {/* ── Left: Stepper + form ─────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col gap-0">
          {/* Live summary on mobile: shown above the stepper */}
          <div className="xl:hidden mb-6">
            <LiveSummary form={form} />
          </div>

          {/* Step card */}
          <div
            className="glass-card rounded-2xl flex flex-col"
            style={{ border: "1px solid rgba(255,255,255,0.08)", minHeight: "520px" }}
          >
            {/* Stepper header */}
            <div className="p-6 pb-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <StepIndicator current={step} total={5} />
            </div>

            {/* Step content */}
            <div className="flex-1 p-6">
              {step === 1 && (
                <Step1 data={form.basic} errors={step1Errors} onChange={updateBasic} />
              )}
              {step === 2 && (
                <Step2 data={form.financial} errors={step2Errors} onChange={updateFinancial} />
              )}
              {step === 3 && (
                <Step3 value={form.riskAnswer} error={step3Error} onChange={updateRisk} />
              )}
              {step === 4 && (
                <Step4 selected={form.goals} error={step4Error} onChange={updateGoals} />
              )}
              {step === 5 && <Step5 form={form} />}
            </div>

            {/* Sticky footer */}
            <div
              className="sticky bottom-0 p-4 md:p-5 flex items-center justify-between gap-3 rounded-b-2xl"
              style={{ background: "rgba(5,11,24,0.9)", backdropFilter: "blur(16px)", borderTop: "1px solid rgba(255,255,255,0.06)" }}
            >
              <button
                type="button"
                onClick={step === 1 ? () => router.back() : goBack}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-80 disabled:opacity-40"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                {step === 1 ? "Cancel" : "Back"}
              </button>

              <div className="flex items-center gap-3">
                {/* Step progress dots */}
                <div className="hidden sm:flex items-center gap-1.5">
                  {STEP_LABELS.map((_, i) => (
                    <div
                      key={i}
                      className="rounded-full transition-all duration-300"
                      style={
                        i + 1 === step
                          ? { width: 20, height: 6, background: "linear-gradient(90deg,#00E5FF,#4F8CFF)" }
                          : i + 1 < step
                          ? { width: 6, height: 6, background: "rgba(0,229,255,0.5)" }
                          : { width: 6, height: 6, background: "rgba(255,255,255,0.12)" }
                      }
                    />
                  ))}
                </div>

                {step < 5 ? (
                  <button
                    type="button"
                    onClick={goNext}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold neon-btn transition-all"
                  >
                    Next
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold neon-btn transition-all disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Creating…
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Create Client
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Submit error */}
            {submitError && (
              <div className="mx-5 mb-4 px-4 py-2.5 rounded-xl text-sm" style={{ background: "rgba(255,77,109,0.1)", border: "1px solid rgba(255,77,109,0.25)", color: "#ff4d6d" }}>
                {submitError}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Live Summary (desktop) ───────────────────── */}
        <div className="hidden xl:block w-72 shrink-0">
          <LiveSummary form={form} />
        </div>
      </div>
    </div>
  );
}

