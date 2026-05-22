"use client";

import { useMemo, useState } from "react";
import {
  INVESTOR_TYPE_OPTIONS,
  NET_WORTH_RANGES,
  RISK_APPETITE_OPTIONS,
} from "@/domains/onboarding";
import type { ClientFinancialProfile, ClientIdentityProfile } from "@/domains/onboarding";

const INPUT_CLASS =
  "w-full rounded-xl border border-white/10 bg-[#0b1120] px-3 py-2 text-sm text-white outline-none transition focus:border-sky-300/40";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.14em] text-slate-400">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

export function ProfileWizardStep({
  identity,
  financial,
  onIdentityChange,
  onFinancialChange,
  onBack,
  onContinue,
}: {
  identity: ClientIdentityProfile;
  financial: ClientFinancialProfile;
  onIdentityChange: (next: ClientIdentityProfile) => void;
  onFinancialChange: (next: ClientFinancialProfile) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [wizardStep, setWizardStep] = useState<0 | 1>(0);
  const progress = useMemo(() => (wizardStep === 0 ? 50 : 100), [wizardStep]);
  const readyToContinue = Boolean(
    identity.name.trim() &&
      identity.mobile.trim() &&
      identity.email.trim() &&
      identity.pan.trim() &&
      identity.dob.trim() &&
      identity.city.trim() &&
      financial.investorType &&
      financial.riskAppetite &&
      financial.netWorthRange &&
      financial.investmentGoals.length > 0 &&
      financial.existingAssetClasses.length > 0
  );

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Guided wealth setup</p>
          <h2 className="mt-1 text-lg font-semibold text-white">Client Profile Wizard</h2>
        </div>
        <p className="text-xs text-slate-400">Step {wizardStep + 1} of 2</p>
      </div>

      <div className="mt-4 h-1.5 rounded-full bg-white/10">
        <div className="h-1.5 rounded-full bg-sky-400 transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      <div className="mt-5">
        {wizardStep === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <input
                value={identity.name}
                onChange={(event) => onIdentityChange({ ...identity, name: event.target.value })}
                className={INPUT_CLASS}
                placeholder="Full name"
              />
            </Field>
            <Field label="Mobile">
              <input
                value={identity.mobile}
                onChange={(event) => onIdentityChange({ ...identity, mobile: event.target.value })}
                className={INPUT_CLASS}
                placeholder="+91"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={identity.email}
                onChange={(event) => onIdentityChange({ ...identity, email: event.target.value })}
                className={INPUT_CLASS}
                placeholder="name@domain.com"
              />
            </Field>
            <Field label="PAN">
              <input
                value={identity.pan}
                onChange={(event) => onIdentityChange({ ...identity, pan: event.target.value.toUpperCase() })}
                className={INPUT_CLASS}
                placeholder="ABCDE1234F"
              />
            </Field>
            <Field label="DOB">
              <input
                type="date"
                value={identity.dob}
                onChange={(event) => onIdentityChange({ ...identity, dob: event.target.value })}
                className={INPUT_CLASS}
              />
            </Field>
            <Field label="City">
              <input
                value={identity.city}
                onChange={(event) => onIdentityChange({ ...identity, city: event.target.value })}
                className={INPUT_CLASS}
                placeholder="Mumbai"
              />
            </Field>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Investor Type">
              <select
                className={INPUT_CLASS}
                value={financial.investorType}
                onChange={(event) => onFinancialChange({ ...financial, investorType: event.target.value as ClientFinancialProfile["investorType"] })}
              >
                <option value="">Select investor type</option>
                {INVESTOR_TYPE_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Risk Appetite">
              <select
                className={INPUT_CLASS}
                value={financial.riskAppetite}
                onChange={(event) => onFinancialChange({ ...financial, riskAppetite: event.target.value as ClientFinancialProfile["riskAppetite"] })}
              >
                <option value="">Select risk profile</option>
                {RISK_APPETITE_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Investment Goals (comma separated)">
              <input
                className={INPUT_CLASS}
                value={financial.investmentGoals.join(", ")}
                onChange={(event) =>
                  onFinancialChange({
                    ...financial,
                    investmentGoals: event.target.value
                      .split(",")
                      .map((goal) => goal.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="Retirement, education, passive income"
              />
            </Field>
            <Field label="Existing Asset Classes (comma separated)">
              <input
                className={INPUT_CLASS}
                value={financial.existingAssetClasses.join(", ")}
                onChange={(event) =>
                  onFinancialChange({
                    ...financial,
                    existingAssetClasses: event.target.value
                      .split(",")
                      .map((assetClass) => assetClass.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="Equity, real estate, debt"
              />
            </Field>
            <Field label="Net Worth Range">
              <select
                className={INPUT_CLASS}
                value={financial.netWorthRange}
                onChange={(event) => onFinancialChange({ ...financial, netWorthRange: event.target.value as ClientFinancialProfile["netWorthRange"] })}
              >
                <option value="">Select range</option>
                {NET_WORTH_RANGES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300 hover:bg-white/[0.06]"
        >
          Back
        </button>
        <div className="flex items-center gap-2">
          {wizardStep > 0 ? (
            <button
              type="button"
              onClick={() => setWizardStep(0)}
              className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300 hover:bg-white/[0.06]"
            >
              Previous
            </button>
          ) : null}
          {wizardStep === 0 ? (
            <button
              type="button"
              onClick={() => setWizardStep(1)}
              className="rounded-xl bg-sky-400 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#04102a] hover:bg-sky-300"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={onContinue}
              disabled={!readyToContinue}
              className="rounded-xl bg-sky-400 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#04102a] hover:bg-sky-300 disabled:opacity-40"
            >
              Save Profile
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
