"use client";

import { useState } from "react";
import SectionCard from "./SectionCard";
import Toggle from "./Toggle";
import Input from "@/components/ui/Input";

interface NotificationConfig {
  enableEmailAlerts: boolean;
  enableWhatsAppAlerts: boolean;
  profitAlertThreshold: number;
  lossAlertThreshold: number;
  portfolioRebalanceAlert: boolean;
}

export default function NotificationsSettings() {
  const [config, setConfig] = useState<NotificationConfig>({
    enableEmailAlerts: true,
    enableWhatsAppAlerts: false,
    profitAlertThreshold: 15,
    lossAlertThreshold: 10,
    portfolioRebalanceAlert: true,
  });

  function patch(partial: Partial<NotificationConfig>) {
    setConfig((prev) => ({ ...prev, ...partial }));
  }

  async function handleSave() {
    await new Promise<void>((resolve) => setTimeout(resolve, 600));
  }

  const toggleRow = (
    label: string,
    description: string,
    checked: boolean,
    onChange: (v: boolean) => void
  ) => (
    <div
      className="flex items-center justify-between rounded-xl px-4 py-3"
      style={{
        background: checked ? "rgba(0,229,255,0.03)" : "rgba(255,255,255,0.02)",
        border: checked ? "1px solid rgba(0,229,255,0.1)" : "1px solid rgba(255,255,255,0.06)",
        transition: "all 0.2s ease",
      }}
    >
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
          {description}
        </p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );

  return (
    <SectionCard
      title="Notifications & Alerts"
      icon={
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
      }
      onSave={handleSave}
    >
      {/* Channels */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
          Alert Channels
        </p>
        {toggleRow(
          "Email Alerts",
          "Send portfolio alerts via email",
          config.enableEmailAlerts,
          (v) => patch({ enableEmailAlerts: v })
        )}
        {toggleRow(
          "WhatsApp Alerts",
          "Send alerts via WhatsApp Business API",
          config.enableWhatsAppAlerts,
          (v) => patch({ enableWhatsAppAlerts: v })
        )}
        {toggleRow(
          "Rebalance Alerts",
          "Notify when portfolio drifts from target allocation",
          config.portfolioRebalanceAlert,
          (v) => patch({ portfolioRebalanceAlert: v })
        )}
      </div>

      {/* Thresholds */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
          Alert Thresholds
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
              Profit Alert (%)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={1}
                max={100}
                step={1}
                value={config.profitAlertThreshold}
                onChange={(e) => patch({ profitAlertThreshold: Number(e.target.value) })}
                className="flex-1 accent-emerald-400"
              />
              <span
                className="text-sm font-semibold w-10 text-right shrink-0"
                style={{ color: "#00ff9f" }}
              >
                {config.profitAlertThreshold}%
              </span>
            </div>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
              Alert when gains exceed this threshold
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
              Loss Alert (%)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={1}
                max={100}
                step={1}
                value={config.lossAlertThreshold}
                onChange={(e) => patch({ lossAlertThreshold: Number(e.target.value) })}
                className="flex-1 accent-red-400"
              />
              <span
                className="text-sm font-semibold w-10 text-right shrink-0"
                style={{ color: "#ff4d6d" }}
              >
                {config.lossAlertThreshold}%
              </span>
            </div>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
              Alert when losses exceed this threshold
            </p>
          </div>
        </div>
      </div>

      {/* Preview card */}
      <div
        className="rounded-xl p-3 flex items-start gap-3"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: "rgba(201,162,39,0.1)", border: "1px solid rgba(201,162,39,0.2)" }}
        >
          <svg className="w-3.5 h-3.5" style={{ color: "#C9A227" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
          </svg>
        </div>
        <div>
          <p className="text-xs font-semibold text-white">Alert Summary</p>
          <p className="text-xs mt-1 leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
            Sending via{" "}
            <span style={{ color: "#00E5FF" }}>
              {[
                config.enableEmailAlerts && "Email",
                config.enableWhatsAppAlerts && "WhatsApp",
              ]
                .filter(Boolean)
                .join(" & ") || "no channel"}
            </span>
            . Alerts fire at <span style={{ color: "#00ff9f" }}>+{config.profitAlertThreshold}%</span>{" "}
            profit or <span style={{ color: "#ff4d6d" }}>-{config.lossAlertThreshold}%</span> loss.
          </p>
        </div>
      </div>
    </SectionCard>
  );
}
