"use client";

import Link from "next/link";
import { useMemo } from "react";
import { MetricTile, SectionHeader, StatusPill, SurfaceCard } from "@/components/v2/ui";
import { summarizeOnboardingPipeline } from "@/domains/admin";
import { useAdminClients } from "@/lib/hooks/useAdminClients";

const ENROLLMENT_FLOW = [
  "Create Client",
  "Assign Advisor",
  "Select Asset Classes",
  "Upload Client Documents",
  "Trigger Portfolio Processing",
  "Review Portfolio",
  "Activate Client Dashboard",
] as const;

const PROFILE_FIELDS = [
  "Name",
  "Mobile",
  "Email",
  "PAN",
  "DOB",
  "City",
  "Investor Type",
  "Risk Appetite",
  "Relationship Manager",
  "Notes",
] as const;

function toneForQueueState(value: string): "info" | "success" | "warn" | "danger" {
  if (value === "activated") return "success";
  if (value === "processing") return "info";
  if (["lead_created", "documents_pending"].includes(value)) return "warn";
  return "warn";
}

export function AdminClientOperationsEnrollment() {
  const { clients, loading, error } = useAdminClients();
  const pipeline = useMemo(() => summarizeOnboardingPipeline(clients), [clients]);

  return (
    <div className="space-y-5 animate-fade-in">
      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader
          eyebrow="Client operations"
          title="Admin-operated client enrollment workflow"
          subtitle="Concierge enrollment runbook for advisors and operations managers"
          action={<Link href="/admin/clients/new" className="v2-link">Create client profile →</Link>}
        />
        {error ? <div className="mt-4 rounded-xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricTile label="Open enrollments" value={String(pipeline.pendingOnboardings.length)} />
          <MetricTile label="Advisor review" value={String(pipeline.overview.filter((entry) => entry.onboarding.state === "advisor_review").length)} />
          <MetricTile label="Missing documents" value={String(pipeline.missingDocuments.length)} />
          <MetricTile label="Activation queue" value={String(pipeline.activationReady.length)} />
          {loading ? <MetricTile label="Loading" value="Refreshing..." /> : null}
        </div>
      </SurfaceCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <SurfaceCard className="p-4 sm:p-5">
          <SectionHeader
            eyebrow="Enrollment flow"
            title="Advisor run sequence"
            subtitle="Primary orchestration flow inside admin client operations"
          />
          <div className="mt-4 space-y-2">
            {ENROLLMENT_FLOW.map((step, index) => (
              <div key={step} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-slate-200">
                <span className="mr-2 text-sky-300">{index + 1}.</span>
                {step}
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-4 sm:p-5">
          <SectionHeader
            eyebrow="Profile creation checklist"
            title="Required admin profile inputs"
            subtitle="Capture these fields when creating client records in operations panel"
          />
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {PROFILE_FIELDS.map((field) => (
              <div key={field} className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-slate-200">
                {field}
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-sky-400/20 bg-sky-500/10 px-3 py-3 text-xs text-sky-100">
            Use <span className="font-semibold">/admin/clients/new</span> to create profile records, then continue workflow tracking here.
          </div>
        </SurfaceCard>
      </div>

      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader
          eyebrow="Document manager"
          title="Centralized onboarding document queue"
          subtitle="Category coverage, processing state visibility, advisor review, and completeness tracking"
        />
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-3 py-2">Client</th>
                <th className="px-3 py-2">Queue state</th>
                <th className="px-3 py-2">Categories complete</th>
                <th className="px-3 py-2">Missing docs</th>
                <th className="px-3 py-2">Advisor review</th>
              </tr>
            </thead>
            <tbody>
              {pipeline.overview.slice(0, 12).map(({ client, onboarding }) => {
                const completedCategories = onboarding.documentCategories.filter((item) => item.status === "complete").length;
                return (
                  <tr key={client.id} className="border-t border-white/[0.06]">
                    <td className="px-3 py-3 align-top">
                      <p className="font-medium text-white">{client.name}</p>
                      <p className="text-xs text-slate-500">{client.email || "No email"}</p>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <StatusPill label={onboarding.state.replaceAll("_", " ")} tone={toneForQueueState(onboarding.state)} />
                    </td>
                    <td className="px-3 py-3 align-top text-xs text-slate-300">{completedCategories}/{onboarding.documentCategories.length}</td>
                    <td className="px-3 py-3 align-top text-xs text-slate-300">
                      {onboarding.missingDocumentLabels.length > 0 ? onboarding.missingDocumentLabels.slice(0, 2).join(", ") : "None"}
                    </td>
                    <td className="px-3 py-3 align-top text-xs text-slate-300">
                      {onboarding.advisorAssigned ? "Assigned" : "Unassigned"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SurfaceCard>
    </div>
  );
}
