"use client";

import { useMemo } from "react";
import { ADMIN_ONBOARDING_STATES, deriveClientOnboardingOverview } from "@/domains/admin";
import type { EnrichedClient } from "@/lib/hooks/useAdminClients";

function toneClass(state: string) {
  if (state === "activated") return "border-emerald-400/20 bg-emerald-500/10 text-emerald-100";
  if (state === "processing") return "border-sky-400/20 bg-sky-500/10 text-sky-100";
  if (state === "advisor_review" || state === "awaiting_client_confirmation") return "border-amber-400/20 bg-amber-500/10 text-amber-100";
  return "border-white/15 bg-white/[0.04] text-slate-100";
}

export function ClientOnboardingStatusCard({ client }: { client: EnrichedClient }) {
  const onboarding = useMemo(() => deriveClientOnboardingOverview(client), [client]);

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Onboarding lifecycle</p>
          <h4 className="mt-1 text-sm font-semibold text-white">Advisor-managed activation state</h4>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${toneClass(onboarding.state)}`}>
          {onboarding.state.replaceAll("_", " ")}
        </span>
      </div>

      <div className="space-y-2">
        <div className="h-1.5 rounded-full bg-white/10">
          <div className="h-1.5 rounded-full bg-sky-400 transition-all" style={{ width: `${onboarding.completionPct}%` }} />
        </div>
        <p className="text-xs text-slate-400">{onboarding.completionPct}% complete · Step {onboarding.stateIndex + 1} of {ADMIN_ONBOARDING_STATES.length}</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-white/8 bg-black/20 px-3 py-2 text-xs text-slate-300">
          <p className="text-slate-500">Advisor</p>
          <p className="mt-1 font-semibold text-white">{client.advisorAssigned || client.relationshipManager || "Unassigned"}</p>
        </div>
        <div className="rounded-lg border border-white/8 bg-black/20 px-3 py-2 text-xs text-slate-300">
          <p className="text-slate-500">Processing</p>
          <p className="mt-1 font-semibold text-white">{onboarding.runtimeState || "Idle"}</p>
        </div>
        <div className="rounded-lg border border-white/8 bg-black/20 px-3 py-2 text-xs text-slate-300">
          <p className="text-slate-500">Activation readiness</p>
          <p className="mt-1 font-semibold text-white">{onboarding.activationReady ? "Ready" : "Blocked"}</p>
        </div>
        <div className="rounded-lg border border-white/8 bg-black/20 px-3 py-2 text-xs text-slate-300">
          <p className="text-slate-500">Document completeness</p>
          <p className="mt-1 font-semibold text-white">
            {onboarding.documentCategories.filter((item) => item.status === "complete").length}/{onboarding.documentCategories.length}
          </p>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <div className="rounded-lg border border-white/8 bg-black/20 p-3">
          <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Uploaded documents</p>
          <div className="mt-2 space-y-2 text-xs text-slate-300">
            {onboarding.documentCategories.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2 rounded-md border border-white/8 bg-white/[0.02] px-2 py-1.5">
                <span>{item.label}</span>
                <span className="font-semibold text-white">{item.uploaded}/{item.required}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-white/8 bg-black/20 p-3">
          <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">Missing data alerts</p>
          <div className="mt-2 space-y-2 text-xs text-slate-300">
            {onboarding.missingProfileFields.length === 0 && onboarding.missingDocumentLabels.length === 0 ? (
              <div className="rounded-md border border-emerald-400/20 bg-emerald-500/10 px-2 py-1.5 text-emerald-100">No blocking alerts.</div>
            ) : (
              <>
                {onboarding.missingProfileFields.slice(0, 4).map((field) => (
                  <div key={field} className="rounded-md border border-amber-400/20 bg-amber-500/10 px-2 py-1.5 text-amber-100">
                    Missing profile: {field}
                  </div>
                ))}
                {onboarding.missingDocumentLabels.slice(0, 4).map((label) => (
                  <div key={label} className="rounded-md border border-rose-400/20 bg-rose-500/10 px-2 py-1.5 text-rose-100">
                    Missing document: {label}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
