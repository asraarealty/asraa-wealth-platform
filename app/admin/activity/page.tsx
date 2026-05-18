"use client";

import dynamic from "next/dynamic";
import { LoadingBlock } from "@/components/v2/ui";

const LiveAdminModulePage = dynamic(
  () => import("@/components/admin-os/LiveAdminModulePage").then((mod) => mod.LiveAdminModulePage),
  {
    ssr: false,
    loading: () => <LoadingBlock label="Loading Activity module..." />,
  }
);

export default function AdminActivityPage() {
  return (
    <LiveAdminModulePage
      title="Activity"
      description="Review cross-module operational history for governance, forensics, and continuous improvement."
      buildMetrics={(clients) => {
        const activeSignals = clients.filter((c) => c.lastActivity).length;
        const anomalies = clients.filter((c) => c.activitySignal.toLowerCase().includes("inactive")).length;
        const coverage = clients.length ? (activeSignals * 100) / clients.length : 0;
        return [
          { label: "Tracked Activity Signals", value: String(activeSignals), tone: "info" },
          { label: "Anomalies", value: String(anomalies), tone: anomalies > 0 ? "warn" : "success" },
          { label: "Audit Coverage", value: `${coverage.toFixed(1)}%`, tone: "success" },
        ];
      }}
      workflow={[
        "Capture immutable activity logs from every admin module.",
        "Classify events by risk, ownership, and operational domain.",
        "Provide traceable history for compliance and incident response.",
      ]}
    />
  );
}
