"use client";

import type { ReactNode } from "react";

export function SurfaceCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`v2-surface rounded-2xl ${className}`}>{children}</section>;
}

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
    <div className="flex items-start justify-between gap-3">
      <div>
        {eyebrow ? (
          <p className="text-[10px] uppercase tracking-[0.18em] text-sky-300/70 mb-1">{eyebrow}</p>
        ) : null}
        <h2 className="text-base sm:text-lg font-bold text-white">{title}</h2>
        {subtitle ? <p className="text-xs sm:text-sm text-slate-400 mt-1">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function MetricTile({
  label,
  value,
  change,
  positive,
}: {
  label: string;
  value: string;
  change?: string;
  positive?: boolean;
}) {
  return (
    <div className="v2-tile rounded-xl">
      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-2 text-lg sm:text-xl font-extrabold text-white">{value}</p>
      {change ? (
        <p
          className={`mt-1 text-xs font-semibold ${
            positive === true ? "text-emerald-400" : positive === false ? "text-rose-400" : "text-slate-400"
          }`}
        >
          {change}
        </p>
      ) : null}
    </div>
  );
}

export function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: "info" | "success" | "warn" | "danger";
}) {
  const toneClass = {
    info: "bg-sky-500/10 text-sky-300 border-sky-400/30",
    success: "bg-emerald-500/10 text-emerald-300 border-emerald-400/30",
    warn: "bg-amber-500/10 text-amber-300 border-amber-400/30",
    danger: "bg-rose-500/10 text-rose-300 border-rose-400/30",
  }[tone];

  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-semibold ${toneClass}`}>{label}</span>;
}

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
      <p className="text-xs text-slate-400 mt-1">{message}</p>
    </SurfaceCard>
  );
}

export function LoadingBlock({ label = "Loading operating system data..." }: { label?: string }) {
  return (
    <div className="min-h-[45vh] flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
