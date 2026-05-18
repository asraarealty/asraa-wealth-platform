"use client";

import type { ReactNode } from "react";

/* ─── Core surface card ──────────────────────────────────────────────────── */
export function SurfaceCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`v2-surface rounded-2xl ${className}`}>{children}</section>;
}

/* ─── Section header ─────────────────────────────────────────────────────── */
export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[10px] uppercase tracking-[0.16em] text-blue-400/70 mb-1">{eyebrow}</p>
        ) : null}
        <h2 className="text-sm sm:text-lg font-semibold text-white leading-tight">{title}</h2>
        {subtitle ? <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p> : null}
      </div>
      {action ? <div className="self-start shrink-0">{action}</div> : null}
    </div>
  );
}

/* ─── Metric tile ────────────────────────────────────────────────────────── */
export function MetricTile({
  label,
  value,
  change,
  positive,
  sub,
}: {
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
  sub?: string;
}) {
  return (
    <div className="v2-tile rounded-xl">
      <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500 font-medium">{label}</p>
      <p className="mt-2 text-xl sm:text-2xl font-bold text-white tracking-tight leading-none">{value}</p>
      {change ? (
        <p
          className={`mt-1.5 text-xs font-medium ${
            positive === true ? "text-emerald-400" : positive === false ? "text-rose-400" : "text-slate-500"
          }`}
        >
          {change}
        </p>
      ) : null}
      {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}

/* ─── Status pill ────────────────────────────────────────────────────────── */
export function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "info" | "success" | "warn" | "danger";
}) {
  const toneClass = {
    info:    "bg-blue-500/10 text-blue-300 border-blue-400/25",
    success: "bg-emerald-500/10 text-emerald-300 border-emerald-400/25",
    warn:    "bg-amber-500/10 text-amber-300 border-amber-400/25",
    danger:  "bg-rose-500/10 text-rose-300 border-rose-400/25",
  }[tone];

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${toneClass}`}>
      {label}
    </span>
  );
}

/* ─── Intelligence card — operational AI insight ─────────────────────────── */
export type IntelTone = "success" | "warn" | "danger" | "info";

export function IntelligenceCard({
  title,
  message,
  confidence,
  tone = "info",
}: {
  title: string;
  message: string;
  confidence?: number;
  tone?: IntelTone;
}) {
  const accentMap: Record<IntelTone, string> = {
    success: "intel-card-emerald",
    warn:    "intel-card-amber",
    danger:  "intel-card-red",
    info:    "intel-card-blue",
  };
  const dotColor: Record<IntelTone, string> = {
    success: "bg-emerald-400",
    warn:    "bg-amber-400",
    danger:  "bg-rose-400",
    info:    "bg-blue-400",
  };

  return (
    <div className={`intel-card rounded-xl p-4 ${accentMap[tone]}`}>
      <div className="flex items-start gap-2.5">
        <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${dotColor[tone]}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-snug">{title}</p>
          <p className="mt-1 text-xs text-slate-400 leading-relaxed">{message}</p>
          {confidence !== undefined ? (
            <p className="mt-2 text-[11px] text-slate-500 font-medium">
              {Math.round(confidence * 100)}% confidence
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ─── Alert feed item ────────────────────────────────────────────────────── */
export function AlertFeedItem({
  title,
  message,
  type,
  timestamp,
}: {
  title: string;
  message: string;
  type: string;
  timestamp?: string;
}) {
  const toneMap: Record<string, IntelTone> = {
    risk:        "danger",
    cashflow:    "info",
    rent:        "warn",
    drift:       "warn",
    opportunity: "success",
  };
  const tone: IntelTone = toneMap[type] ?? "info";
  const timeLabel = timestamp
    ? new Date(timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="v2-tile rounded-xl p-3 flex items-start gap-3">
      <StatusPill label={type} tone={tone} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white leading-snug truncate">{title}</p>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{message}</p>
      </div>
      {timeLabel ? (
        <p className="text-[10px] text-slate-600 font-medium shrink-0">{timeLabel}</p>
      ) : null}
    </div>
  );
}

/* ─── Exposure bar ───────────────────────────────────────────────────────── */
export function ExposureBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-slate-400">{label}</span>
        <span className="text-white font-semibold tabular-nums">{value.toFixed(1)}%</span>
      </div>
      <div className="exposure-bar">
        <div className="exposure-bar-fill" style={{ width: `${clamped}%`, background: color }} />
      </div>
    </div>
  );
}

/* ─── Risk score panel ───────────────────────────────────────────────────── */
export function RiskScorePanel({
  score,
  label,
  context,
}: {
  score: "Low" | "Medium" | "High";
  label: string;
  context?: string;
}) {
  const color = score === "High" ? "text-rose-400" : score === "Medium" ? "text-amber-400" : "text-emerald-400";
  const bg    = score === "High" ? "bg-rose-500/8 border-rose-400/20" : score === "Medium" ? "bg-amber-500/8 border-amber-400/20" : "bg-emerald-500/8 border-emerald-400/20";

  return (
    <div className={`v2-tile rounded-xl border ${bg} p-4`}>
      <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500 font-medium">Portfolio Risk</p>
      <p className={`mt-2 text-2xl font-bold ${color}`}>{score}</p>
      <p className="mt-1 text-xs text-slate-400">{label}</p>
      {context ? <p className="mt-1 text-xs text-slate-500">{context}</p> : null}
    </div>
  );
}

/* ─── Property health card ───────────────────────────────────────────────── */
export function PropertyHealthCard({
  name,
  occupied,
  rentStatus,
  monthlyRent,
}: {
  name: string;
  occupied: boolean;
  rentStatus: "overdue" | "due-soon" | "clear";
  monthlyRent: string;
}) {
  const statusTone: IntelTone = rentStatus === "overdue" ? "danger" : rentStatus === "due-soon" ? "warn" : "success";
  const statusLabel = rentStatus === "overdue" ? "Rent overdue" : rentStatus === "due-soon" ? "Due soon" : "Rent clear";

  return (
    <div className="v2-tile rounded-xl p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-white truncate">{name}</p>
        <StatusPill label={occupied ? "Occupied" : "Vacant"} tone={occupied ? "success" : "warn"} />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500">{monthlyRent} / mo</p>
        <StatusPill label={statusLabel} tone={statusTone} />
      </div>
    </div>
  );
}

/* ─── Financial goal card ────────────────────────────────────────────────── */
export function FinancialGoalCard({
  title,
  current,
  target,
  progress,
  horizon,
}: {
  title: string;
  current: string;
  target: string;
  progress: number;
  horizon?: string;
}) {
  const clamped = Math.max(0, Math.min(100, progress));
  const tone = clamped >= 75 ? "emerald" : clamped >= 40 ? "blue" : "amber";
  const barColor = tone === "emerald" ? "#10b981" : tone === "blue" ? "#3b82f6" : "#f59e0b";

  return (
    <div className="v2-tile rounded-xl p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-white">{title}</p>
        {horizon ? <p className="text-[10px] text-slate-500 font-medium shrink-0">{horizon}</p> : null}
      </div>
      <div className="mt-3 exposure-bar">
        <div className="exposure-bar-fill" style={{ width: `${clamped}%`, background: barColor }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-slate-400">{current} invested</span>
        <span className="text-slate-500">Goal: {target}</span>
      </div>
    </div>
  );
}

/* ─── Empty / loading states ─────────────────────────────────────────────── */
export function EmptyBlock({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <SurfaceCard className="p-6 text-center">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="text-xs text-slate-500 mt-1">{message}</p>
    </SurfaceCard>
  );
}

export function LoadingBlock({ label = "Loading operating system data..." }: { label?: string }) {
  return (
    <div className="min-h-[45vh] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-blue-500/60 border-t-transparent animate-spin" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
