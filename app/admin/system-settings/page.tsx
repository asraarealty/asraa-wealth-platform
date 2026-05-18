"use client";

import dynamic from "next/dynamic";
import { LoadingBlock } from "@/components/v2/ui";

const LiveAdminModulePage = dynamic(
  () => import("@/components/admin-os/LiveAdminModulePage").then((mod) => mod.LiveAdminModulePage),
  {
    ssr: false,
    loading: () => <LoadingBlock label="Loading System Settings module..." />,
  }
);

const SystemCapabilityPanel = dynamic(
  () => import("@/components/admin-os/SystemCapabilityPanel").then((mod) => mod.SystemCapabilityPanel),
  {
    ssr: false,
    loading: () => <LoadingBlock label="Loading capability overlays..." />,
  }
);

export default function AdminSystemSettingsPage() {
  return (
    <div className="space-y-5">
      <LiveAdminModulePage
        title="System Settings"
        description="Configure platform policy, permissions, and runtime controls for the admin operating environment."
        buildMetrics={(clients) => {
          const pending = clients.filter((c) => c.approvalStatus === "pending").length;
          const active = clients.filter((c) => c.status === "active").length;
          const health = clients.length ? (active * 100) / clients.length : 100;
          return [
            { label: "Managed policy entities", value: String(clients.length), tone: "info" },
            { label: "Pending changes", value: String(pending), tone: pending > 0 ? "warn" : "success" },
            { label: "Runtime health", value: `${health.toFixed(1)}%`, tone: "success" },
          ];
        }}
        workflow={[
          "Define access controls, compliance defaults, and module guardrails.",
          "Validate staged policy updates before production rollout.",
          "Monitor system integrity after configuration changes.",
        ]}
      />

      <SystemCapabilityPanel />
    </div>
  );
}
