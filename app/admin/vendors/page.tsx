"use client";

import dynamic from "next/dynamic";
import { LoadingBlock } from "@/components/v2/ui";

const LiveAdminModulePage = dynamic(
  () => import("@/components/admin-os/LiveAdminModulePage").then((mod) => mod.LiveAdminModulePage),
  {
    ssr: false,
    loading: () => <LoadingBlock label="Loading Vendors module..." />,
  }
);

export default function AdminVendorsPage() {
  return (
    <LiveAdminModulePage
      title="Vendors"
      description="Manage external partners, service SLAs, and integration performance across institutional operations."
      buildMetrics={(clients, kpis) => {
        const propertyBook = kpis.totalProperties;
        const breaches = clients.filter((c) => c.status === "suspended" || c.status === "archived").length;
        const health = clients.length ? ((clients.length - breaches) * 100) / clients.length : 100;
        return [
          { label: "Operational vendor dependencies", value: String(propertyBook), tone: "info" },
          { label: "Escalated workflows", value: String(breaches), tone: breaches > 0 ? "warn" : "success" },
          { label: "Healthy operations", value: `${health.toFixed(1)}%`, tone: "success" },
        ];
      }}
      workflow={[
        "Track vendor obligations, incidents, and service-level adherence.",
        "Measure connector reliability for external systems.",
        "Escalate contract or performance risks to operations leadership.",
      ]}
    />
  );
}
