"use client";

import Link from "next/link";
import {
  AlertFeedItem,
  IntelligenceCard,
  MetricTile,
  PropertyHealthCard,
  SectionHeader,
  StatusPill,
  SurfaceCard,
} from "@/components/v2/ui";
import type { DashboardOperatingData } from "@/lib/hooks/useOperatingSystem";

interface IntelCard {
  title: string;
  message: string;
  tone: "success" | "info" | "warn" | "danger";
  confidence?: number;
}

function fmtCompact(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export function IntelligenceSection({ intelCards }: { intelCards: IntelCard[] }) {
  return (
    <SurfaceCard className="p-4 sm:p-5">
      <SectionHeader
        eyebrow="AI Intelligence"
        title="Operational insights"
        subtitle="Contextual analysis from live portfolio, cashflow and property data"
        action={<Link href="/insights" className="v2-link">Full analysis →</Link>}
      />
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {intelCards.map((card, i) => (
          <IntelligenceCard
            key={i}
            title={card.title}
            message={card.message}
            tone={card.tone}
            confidence={card.confidence}
          />
        ))}
      </div>
    </SurfaceCard>
  );
}

export function ActionsRecommendationsSection({ data }: { data: DashboardOperatingData }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
      <SurfaceCard className="p-4 sm:p-5 xl:col-span-3">
        <SectionHeader
          eyebrow="Priority Actions"
          title="What needs attention"
          subtitle="Ranked by urgency across portfolio, property and cashflow"
        />
        <div className="mt-4 space-y-2">
          {data.priorityActions.length === 0 ? (
            <p className="text-xs text-slate-500">No outstanding actions. Portfolio is operating normally.</p>
          ) : (
            data.priorityActions.map((action) => (
              <div key={action.id} className="v2-tile rounded-xl p-3 flex items-start gap-3">
                <StatusPill
                  label={action.severity.toUpperCase()}
                  tone={action.severity === "high" ? "danger" : action.severity === "medium" ? "warn" : "info"}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{action.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{action.description}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-4 sm:p-5 xl:col-span-2">
        <SectionHeader
          eyebrow="Recommendations"
          title="Next-best actions"
          subtitle="Confidence-ranked AI suggestions"
        />
        <div className="mt-4 space-y-3">
          {data.recommendations.length === 0 ? (
            <p className="text-xs text-slate-500">No predictive actions flagged.</p>
          ) : (
            data.recommendations.map((r) => (
              <IntelligenceCard
                key={r.id}
                title={r.title}
                message={r.rationale}
                confidence={r.confidence}
                tone="info"
              />
            ))
          )}
        </div>
      </SurfaceCard>
    </div>
  );
}

export function RealEstateActivitySection({ data }: { data: DashboardOperatingData }) {
  const topProperties = data.properties.slice(0, 4);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
      <SurfaceCard className="p-4 sm:p-5 xl:col-span-2">
        <SectionHeader
          eyebrow="Property Operations"
          title="Real estate health"
          subtitle="Rent pipeline, occupancy and cashflow"
          action={<Link href="/real-estate" className="v2-link">Full ops →</Link>}
        />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <MetricTile label="RE Asset Value" value={fmtCompact(data.realEstate.totalValue)} />
          <MetricTile label="Monthly Rent" value={fmtCompact(data.realEstate.monthlyRent)} />
          <MetricTile label="Occupied" value={String(data.realEstate.occupied)} sub="units" />
          <MetricTile
            label="Rental Yield"
            value={`${data.realEstate.rentalYieldPct.toFixed(1)}%`}
            sub="Annual gross"
          />
        </div>

        {topProperties.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500 font-medium">Property status</p>
            {topProperties.map((p) => {
              const isOccupied = Boolean(p.tenant_name);
              const rentStatus: "overdue" | "due-soon" | "clear" = !p.rent_due_date
                ? "clear"
                : (() => {
                    const diff = Math.ceil(
                      (new Date(p.rent_due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                    );
                    if (diff < 0 && !p.rent_received) return "overdue";
                    if (diff <= 5 && !p.rent_received) return "due-soon";
                    return "clear";
                  })();
              return (
                <PropertyHealthCard
                  key={p.id}
                  name={p.name}
                  occupied={isOccupied}
                  rentStatus={rentStatus}
                  monthlyRent={
                    p.rent_amount
                      ? fmtCompact(Number(p.rent_amount))
                      : "—"
                  }
                />
              );
            })}
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {data.realEstate.overdueRent > 0 && (
            <StatusPill label={`${data.realEstate.overdueRent} overdue`} tone="danger" />
          )}
          {data.realEstate.dueSoonRent > 0 && (
            <StatusPill label={`${data.realEstate.dueSoonRent} due soon`} tone="warn" />
          )}
          {data.realEstate.leaseExpiry > 0 && (
            <StatusPill label={`${data.realEstate.leaseExpiry} expiring`} tone="warn" />
          )}
          {data.realEstate.overdueRent === 0 && data.realEstate.dueSoonRent === 0 && (
            <StatusPill label="Rent pipeline clear" tone="success" />
          )}
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-4 sm:p-5 xl:col-span-3">
        <SectionHeader
          eyebrow="Activity + Transactions"
          title="Operational timeline"
          subtitle="Cross-domain event stream — assets, properties, intelligence"
          action={<Link href="/activity" className="v2-link">View all →</Link>}
        />
        <div className="mt-4 space-y-2 max-h-[380px] overflow-y-auto pr-1">
          {data.activityFeed.length === 0 ? (
            <p className="text-xs text-slate-500">No recent activity recorded.</p>
          ) : (
            data.activityFeed.slice(0, 10).map((event) => (
              <AlertFeedItem
                key={event.id}
                title={event.title}
                message={event.message}
                type={event.type}
                timestamp={event.timestamp}
              />
            ))
          )}
        </div>
      </SurfaceCard>
    </div>
  );
}
