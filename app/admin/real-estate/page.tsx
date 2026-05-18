"use client";

import dynamic from "next/dynamic";
import { LoadingBlock } from "@/components/v2/ui";

const LiveAdminModulePage = dynamic(
  () => import("@/components/admin-os/LiveAdminModulePage").then((mod) => mod.LiveAdminModulePage),
  {
    ssr: false,
    loading: () => <LoadingBlock label="Loading Real Estate module..." />,
  }
);

export default function AdminRealEstatePage() {
  return (
    <LiveAdminModulePage
      title="Real Estate"
      description="Track occupancy, lease lifecycle, maintenance risk, and property-level operating performance."
      buildMetrics={(clients, kpis) => {
        const propertyAssets = clients.flatMap((c) => c.assets.filter((a) => a.type === "property"));
        const occupied = propertyAssets.filter((a) => Boolean(a.tenantName ?? a.tenant_name)).length;
        const occupancy = propertyAssets.length ? (occupied * 100) / propertyAssets.length : 0;
        const overdue = propertyAssets.filter((a) => (a.rentDueDate || a.rent_due_date) && new Date(String(a.rentDueDate ?? a.rent_due_date)).getTime() < Date.now()).length;
        return [
          { label: "Managed Properties", value: String(kpis.totalProperties), tone: "info" },
          { label: "Occupancy", value: `${occupancy.toFixed(1)}%`, tone: "success" },
          { label: "Overdue Rent Alerts", value: String(overdue), tone: overdue > 0 ? "warn" : "success" },
        ];
      }}
      workflow={[
        "Consolidate property telemetry from rent and maintenance systems.",
        "Highlight units at risk of vacancy or delayed collections.",
        "Escalate SLA breaches to operations teams and vendors.",
      ]}
    />
  );
}
