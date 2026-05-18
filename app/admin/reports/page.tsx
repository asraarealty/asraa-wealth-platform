"use client";

import dynamic from "next/dynamic";
import { LoadingBlock } from "@/components/v2/ui";

const LiveAdminModulePage = dynamic(
  () => import("@/components/admin-os/LiveAdminModulePage").then((mod) => mod.LiveAdminModulePage),
  {
    ssr: false,
    loading: () => <LoadingBlock label="Loading Reports module..." />,
  }
);

export default function AdminReportsPage() {
  return (
    <LiveAdminModulePage
      title="Reports"
      description="Generate executive, investor, and regulatory reporting from centralized platform intelligence."
      buildMetrics={(clients) => {
        const reportReady = clients.filter((c) => c.approvalStatus === "approved" && c.status === "active").length;
        const review = clients.filter((c) => c.approvalStatus !== "approved").length;
        const onTime = clients.length ? (reportReady * 100) / clients.length : 100;
        return [
          { label: "Report-ready clients", value: String(reportReady), tone: "info" },
          { label: "On-time readiness", value: `${onTime.toFixed(1)}%`, tone: "success" },
          { label: "Review Required", value: String(review), tone: review > 0 ? "warn" : "success" },
        ];
      }}
      workflow={[
        "Assemble validated data snapshots from all operating modules.",
        "Apply templates for executive, investor, and compliance reporting.",
        "Distribute outputs with audit metadata and version control.",
      ]}
    />
  );
}
