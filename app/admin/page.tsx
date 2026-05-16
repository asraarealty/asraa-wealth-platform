import Link from "next/link";
import { MetricTile, SectionHeader, StatusPill, SurfaceCard } from "@/components/v2/ui";
import { ADMIN_NAV_ITEMS } from "@/components/admin-os/navigation";

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

const operationalMetrics = {
  totalAum: 582_450_000,
  activeClients: 148,
  managedAssets: 624,
  transactionVolume: 18_920_000,
  pendingTransactions: 23,
  notificationEvents: 76,
  criticalAlerts: 3,
  growthRate: 18.4,
  systemUptime: 99.97,
  occupancyRate: 94.2,
};

export default function AdminOverviewPage() {
  return (
    <div className="space-y-5">
      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader
          eyebrow="Admin Operations OS"
          title="Platform overview"
          subtitle="Institutional control center for analytics, operations, and system reliability"
        />

        <div className="mt-4 grid grid-cols-2 lg:grid-cols-5 gap-3">
          <MetricTile label="Total AUM" value={fmt(operationalMetrics.totalAum)} />
          <MetricTile label="Active Clients" value={String(operationalMetrics.activeClients)} />
          <MetricTile label="Managed Assets" value={String(operationalMetrics.managedAssets)} />
          <MetricTile label="Txn Volume" value={fmt(operationalMetrics.transactionVolume)} />
          <MetricTile
            label="Growth"
            value={`${operationalMetrics.growthRate.toFixed(1)}%`}
            change="Quarter over quarter"
            positive
          />
        </div>
      </SurfaceCard>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <SurfaceCard className="p-4 sm:p-5 xl:col-span-2">
          <SectionHeader
            eyebrow="Operational Intelligence"
            title="Live operations board"
            subtitle="Transaction monitoring, property operations, and event flow"
          />
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="v2-tile rounded-xl p-3">
              <p className="text-xs text-slate-400">Transaction Monitoring</p>
              <p className="text-lg font-semibold text-white mt-1">{operationalMetrics.pendingTransactions} pending reviews</p>
              <div className="mt-2">
                <StatusPill label="Needs action" tone="warn" />
              </div>
            </div>
            <div className="v2-tile rounded-xl p-3">
              <p className="text-xs text-slate-400">Notifications & Events</p>
              <p className="text-lg font-semibold text-white mt-1">{operationalMetrics.notificationEvents} queued</p>
              <div className="mt-2">
                <StatusPill label="Routing active" tone="info" />
              </div>
            </div>
            <div className="v2-tile rounded-xl p-3">
              <p className="text-xs text-slate-400">Property Operations</p>
              <p className="text-lg font-semibold text-white mt-1">{operationalMetrics.occupancyRate.toFixed(1)}% occupancy</p>
              <div className="mt-2">
                <StatusPill label="Stable" tone="success" />
              </div>
            </div>
            <div className="v2-tile rounded-xl p-3">
              <p className="text-xs text-slate-400">Asset Distribution</p>
              <p className="text-sm text-slate-200 mt-1">Equity 42% · Funds 34% · Real Estate 24%</p>
              <div className="mt-2">
                <StatusPill label="Balanced" tone="success" />
              </div>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-4 sm:p-5">
          <SectionHeader eyebrow="System Health" title="Runtime status" subtitle="Reliability + alerts" />
          <div className="mt-4 space-y-3">
            <div className="v2-tile rounded-xl p-3">
              <p className="text-xs text-slate-400">Platform uptime</p>
              <p className="text-lg font-semibold text-white mt-1">{operationalMetrics.systemUptime.toFixed(2)}%</p>
              <div className="mt-2">
                <StatusPill label="Healthy" tone="success" />
              </div>
            </div>
            <div className="v2-tile rounded-xl p-3">
              <p className="text-xs text-slate-400">Operational alerts</p>
              <p className="text-lg font-semibold text-white mt-1">{operationalMetrics.criticalAlerts} critical</p>
              <div className="mt-2">
                <StatusPill label="Escalated" tone="danger" />
              </div>
            </div>
            <div className="v2-tile rounded-xl p-3">
              <p className="text-xs text-slate-400">User management queue</p>
              <p className="text-sm text-slate-200 mt-1">12 onboarding approvals pending</p>
              <div className="mt-2">
                <StatusPill label="Review required" tone="warn" />
              </div>
            </div>
          </div>
        </SurfaceCard>
      </div>

      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader
          eyebrow="Navigation Architecture"
          title="Admin modules"
          subtitle="Dedicated admin operating environment separate from client wealth OS"
        />
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {ADMIN_NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className="v2-tile rounded-xl p-3 hover:bg-white/10 transition-colors">
              <p className="text-sm font-semibold text-white">{item.label}</p>
              <p className="text-xs text-slate-400 mt-1">{item.description}</p>
            </Link>
          ))}
        </div>
      </SurfaceCard>
    </div>
  );
}
