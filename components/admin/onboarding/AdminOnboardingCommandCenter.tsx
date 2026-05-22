"use client";

import Link from "next/link";
import { MetricTile, SectionHeader, StatusPill, SurfaceCard } from "@/components/v2/ui";
import { PROCESSING_RUNTIME_STATES, summarizeOnboardingPipeline } from "@/domains/admin";
import { useAdminClients } from "@/lib/hooks/useAdminClients";

function toneForState(state: string): "info" | "success" | "warn" | "danger" {
  if (state === "activated") return "success";
  if (state === "processing" || state === "advisor_review") return "info";
  if (state === "awaiting_client_confirmation") return "warn";
  return "warn";
}

export function AdminOnboardingCommandCenter() {
  const { clients, loading, error } = useAdminClients();
  const pipeline = summarizeOnboardingPipeline(clients);

  return (
    <div className="space-y-5 animate-fade-in">
      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader
          eyebrow="Onboarding command center"
          title="Advisor-managed client activation pipeline"
          subtitle="Operations-first enrollment monitoring across profile creation, document ingestion, processing, review, and activation"
          action={<Link href="/admin/client-operations" className="v2-link">Open client enrollment workflow →</Link>}
        />
        {error ? <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricTile label="Pending onboardings" value={String(pipeline.pendingOnboardings.length)} />
          <MetricTile label="Processing queue" value={String(pipeline.processingQueue.length)} sub="Ingestion and valuation runtime" />
          <MetricTile label="Incomplete client setups" value={String(pipeline.incompleteClientSetups.length)} />
          <MetricTile label="Activation ready" value={String(pipeline.activationReady.length)} />
          {loading ? <MetricTile label="Loading" value="Refreshing..." /> : null}
        </div>
      </SurfaceCard>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <SurfaceCard className="p-4 sm:p-5">
          <SectionHeader
            eyebrow="Pipeline monitor"
            title="Onboarding lifecycle queue"
            subtitle="Lead creation to dashboard activation with advisor ownership"
          />
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-3 py-2">Client</th>
                  <th className="px-3 py-2">Onboarding state</th>
                  <th className="px-3 py-2">Advisor</th>
                  <th className="px-3 py-2">Completeness</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pipeline.overview.slice(0, 12).map(({ client, onboarding }) => (
                  <tr key={client.id} className="border-t border-white/[0.06]">
                    <td className="px-3 py-3 align-top">
                      <p className="font-medium text-white">{client.name}</p>
                      <p className="text-xs text-slate-500">{client.email || "No email"}</p>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <StatusPill label={onboarding.state.replaceAll("_", " ")} tone={toneForState(onboarding.state)} />
                      {onboarding.runtimeState ? <p className="mt-1 text-xs text-slate-400">{onboarding.runtimeState}</p> : null}
                    </td>
                    <td className="px-3 py-3 align-top text-xs text-slate-300">
                      {client.advisorAssigned || client.relationshipManager || "Unassigned"}
                    </td>
                    <td className="px-3 py-3 align-top text-xs text-slate-300">
                      <p>{onboarding.completionPct}% complete</p>
                      <p className="mt-1 text-slate-500">
                        {onboarding.missingDocumentLabels.length > 0
                          ? `${onboarding.missingDocumentLabels.length} missing docs`
                          : "Documents complete"}
                      </p>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <Link href={`/admin/clients/${client.id}/edit`} className="text-xs font-semibold text-sky-300 hover:text-sky-200">
                        Open client
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SurfaceCard>

        <div className="space-y-4">
          <SurfaceCard className="p-4 sm:p-5">
            <SectionHeader eyebrow="Activation readiness" title="Missing data and advisor assignments" />
            <div className="mt-3 space-y-2">
              <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-3 text-sm text-amber-100">
                {pipeline.missingDocuments.length} client{pipeline.missingDocuments.length === 1 ? "" : "s"} with missing documents.
              </div>
              <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-3 text-sm text-rose-100">
                {pipeline.unassignedAdvisors.length} client{pipeline.unassignedAdvisors.length === 1 ? "" : "s"} without advisor assignment.
              </div>
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-100">
                {pipeline.activationReady.length} client{pipeline.activationReady.length === 1 ? "" : "s"} ready for activation approval.
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard className="p-4 sm:p-5">
            <SectionHeader eyebrow="Processing runtime" title="Portfolio processing states" subtitle="Operational state labels for advisor workflow visibility" />
            <div className="mt-3 space-y-2">
              {PROCESSING_RUNTIME_STATES.map((label) => (
                <div key={label} className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-slate-200">
                  {label}
                </div>
              ))}
            </div>
          </SurfaceCard>
        </div>
      </div>
    </div>
  );
}
