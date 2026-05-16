"use client";

import Link from "next/link";
import { useOperatingSystemData } from "@/lib/hooks/useOperatingSystem";
import { EmptyBlock, LoadingBlock, MetricTile, SectionHeader, StatusPill, SurfaceCard } from "@/components/v2/ui";

function money(v: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);
}

function leaseTag(dueDate: string | null) {
  if (!dueDate) return { label: "No due date", tone: "info" as const };
  const now = new Date();
  const due = new Date(dueDate);
  const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return { label: `Overdue ${Math.abs(diff)}d`, tone: "danger" as const };
  if (diff <= 30) return { label: `Due in ${diff}d`, tone: "warn" as const };
  return { label: "On track", tone: "success" as const };
}

export default function RealEstatePage() {
  const { data, isLoading, isError } = useOperatingSystemData();

  if (isLoading) return <LoadingBlock label="Loading real estate operations..." />;
  if (isError) return <EmptyBlock title="Real estate operations unavailable" message="Please retry once backend connectivity is restored." />;

  const properties = data.realEstate.properties;

  return (
    <div className="space-y-5">
      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader
          eyebrow="Real Estate Operations"
          title="Property operating layer"
          subtitle="Rent pipeline, occupancy health, lease milestones and cashflow"
          action={<Link href="/assets/new" className="v2-action">+ Add Property</Link>}
        />

        <div className="mt-4 grid grid-cols-2 lg:grid-cols-5 gap-3">
          <MetricTile label="Asset Value" value={money(data.realEstate.totalValue)} />
          <MetricTile label="Monthly Rent" value={money(data.realEstate.monthlyRent)} />
          <MetricTile label="Properties" value={String(properties.length)} />
          <MetricTile label="Occupied" value={String(data.realEstate.occupied)} />
          <MetricTile label="Overdue / Due Soon" value={`${data.realEstate.overdueRent} / ${data.realEstate.dueSoonRent}`} />
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader eyebrow="Operations Queue" title="Rent and lease milestones" subtitle="Actionable tenant timeline and status layer" />

        {properties.length === 0 ? (
          <p className="text-sm text-slate-400 mt-4">No property records found yet.</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-3">
            {properties.map((p) => {
              const lease = leaseTag(p.rent_due_date);
              const yieldPct = p.current_value && p.current_value > 0 && p.rent_amount
                ? ((p.rent_amount * 12) / p.current_value) * 100
                : 0;

              return (
                <article key={p.id} className="v2-tile rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-white">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.location ?? "Location pending"}</p>
                    </div>
                    <StatusPill label={lease.label} tone={lease.tone} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-slate-400">Current Value</p>
                      <p className="text-white font-semibold mt-1">{money(p.current_value ?? p.value ?? 0)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Rent / month</p>
                      <p className="text-white font-semibold mt-1">{money(p.rent_amount ?? 0)}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Tenant</p>
                      <p className="text-white font-semibold mt-1">{p.tenant_name ?? "Vacant"}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Gross Yield</p>
                      <p className="text-white font-semibold mt-1">{yieldPct ? `${yieldPct.toFixed(2)}%` : "—"}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </SurfaceCard>

      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader eyebrow="Portfolio Linkage" title="Allocation and cashflow impact" subtitle="How property operations influence total portfolio outcomes" />
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="v2-slot">Property allocation impact: {data.allocation.property.toFixed(1)}%</div>
          <div className="v2-slot">Cashflow contribution: {money(data.realEstate.monthlyRent)} / month</div>
          <div className="v2-slot">Concentration signal: {properties.length <= 1 ? "High" : properties.length <= 3 ? "Medium" : "Low"}</div>
        </div>
      </SurfaceCard>
    </div>
  );
}
