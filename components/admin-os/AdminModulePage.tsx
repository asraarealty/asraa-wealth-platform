import Link from "next/link";
import { SurfaceCard, SectionHeader, StatusPill } from "@/components/v2/ui";

type ModuleMetric = {
  label: string;
  value: string;
  tone: "info" | "success" | "warn" | "danger";
};

export function AdminModulePage({
  title,
  description,
  metrics,
  workflow,
}: {
  title: string;
  description: string;
  metrics: ModuleMetric[];
  workflow: string[];
}) {
  return (
    <div className="space-y-5">
      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader
          eyebrow="Admin Operations Module"
          title={title}
          subtitle={description}
          action={
            <Link href="/admin" className="v2-link">
              Back to overview
            </Link>
          }
        />
      </SurfaceCard>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <SurfaceCard key={metric.label} className="p-4">
            <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">{metric.label}</p>
            <p className="text-xl font-bold text-white mt-2">{metric.value}</p>
            <div className="mt-3">
              <StatusPill label="Operational" tone={metric.tone} />
            </div>
          </SurfaceCard>
        ))}
      </div>

      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader eyebrow="Execution" title="Module workflow" subtitle="Centralized orchestration pipeline" />
        <ol className="mt-4 space-y-2">
          {workflow.map((step, index) => (
            <li key={step} className="v2-tile rounded-xl p-3 text-sm text-slate-300 flex items-start gap-2">
              <span className="text-sky-300 font-semibold">{index + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </SurfaceCard>
    </div>
  );
}
