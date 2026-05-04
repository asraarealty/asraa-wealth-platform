"use client";

import { useState } from "react";
import SectionCard from "./SectionCard";
import Toggle from "./Toggle";
import Input from "@/components/ui/Input";

interface PlatformConfig {
  platformName: string;
  defaultCurrency: "INR" | "USD";
  currencyConversion: boolean;
  timezone: string;
}

const TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "UTC",
];

const selectClass =
  "w-full rounded-xl px-4 py-3 text-sm neon-input appearance-none";

export default function PlatformSettings() {
  const [config, setConfig] = useState<PlatformConfig>({
    platformName: "Asraa Wealth Platform",
    defaultCurrency: "INR",
    currencyConversion: false,
    timezone: "Asia/Kolkata",
  });

  function patch(partial: Partial<PlatformConfig>) {
    setConfig((prev) => ({ ...prev, ...partial }));
  }

  async function handleSave() {
    await new Promise<void>((resolve) => setTimeout(resolve, 600));
  }

  return (
    <SectionCard
      title="Platform Settings"
      icon={
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      }
      onSave={handleSave}
    >
      {/* Platform Name */}
      <Input
        label="Platform Name"
        value={config.platformName}
        onChange={(e) => patch({ platformName: e.target.value })}
        placeholder="e.g. Asraa Wealth Platform"
      />

      {/* Default Currency */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
          Default Currency
        </label>
        <select
          className={selectClass}
          value={config.defaultCurrency}
          onChange={(e) =>
            patch({ defaultCurrency: e.target.value as "INR" | "USD" })
          }
        >
          <option value="INR">INR — Indian Rupee</option>
          <option value="USD">USD — US Dollar</option>
        </select>
      </div>

      {/* Currency Conversion toggle — only when USD is selected */}
      {config.defaultCurrency === "USD" && (
        <div
          className="flex items-center justify-between rounded-xl px-4 py-3"
          style={{
            background: "rgba(0,229,255,0.04)",
            border: "1px solid rgba(0,229,255,0.1)",
          }}
        >
          <div>
            <p className="text-sm font-medium text-white">Currency Conversion</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
              Auto-convert INR values to USD
            </p>
          </div>
          <Toggle
            checked={config.currencyConversion}
            onChange={(v) => patch({ currencyConversion: v })}
          />
        </div>
      )}

      {/* Timezone */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
          Timezone
        </label>
        <select
          className={selectClass}
          value={config.timezone}
          onChange={(e) => patch({ timezone: e.target.value })}
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>
    </SectionCard>
  );
}
