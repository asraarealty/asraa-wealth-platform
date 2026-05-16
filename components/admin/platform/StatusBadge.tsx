"use client";

import type { ReactNode } from "react";

export type StatusTone = "info" | "success" | "warn" | "danger" | "neutral";

const TONE_CLASS: Record<StatusTone, string> = {
  info: "border-sky-400/30 bg-sky-500/10 text-sky-200",
  success: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
  warn: "border-amber-400/30 bg-amber-500/10 text-amber-100",
  danger: "border-rose-400/30 bg-rose-500/10 text-rose-200",
  neutral: "border-white/10 bg-white/5 text-slate-200",
};

export function getStatusTone(status: string | undefined | null): StatusTone {
  const normalized = String(status ?? "").toLowerCase();
  if (["active", "approved", "healthy", "occupied", "paid", "live"].includes(normalized)) {
    return "success";
  }
  if (["inactive", "pending", "review", "due soon", "watchlist"].includes(normalized)) {
    return "warn";
  }
  if (["suspended", "archived", "rejected", "overdue", "vacant", "critical"].includes(normalized)) {
    return "danger";
  }
  if (["intelligence", "synced", "connected", "info"].includes(normalized)) {
    return "info";
  }
  return "neutral";
}

export function StatusBadge({
  label,
  tone,
  icon,
}: {
  label: string;
  tone?: StatusTone;
  icon?: ReactNode;
}) {
  const resolvedTone = tone ?? getStatusTone(label);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${TONE_CLASS[resolvedTone]}`}
    >
      {icon}
      {label}
    </span>
  );
}
