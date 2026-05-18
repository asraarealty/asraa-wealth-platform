"use client";

import dynamic from "next/dynamic";
import { LoadingBlock } from "@/components/v2/ui";

const LiveAdminModulePage = dynamic(
  () => import("@/components/admin-os/LiveAdminModulePage").then((mod) => mod.LiveAdminModulePage),
  {
    ssr: false,
    loading: () => <LoadingBlock label="Loading Insights module..." />,
  }
);

export default function AdminInsightsPage() {
  return (
    <LiveAdminModulePage
      title="Insights"
      description="Analyze growth analytics, behavior trends, and opportunity intelligence for executive planning."
      buildMetrics={(clients, kpis) => {
        const growth = kpis.totalAUM > 0 ? (clients.reduce((sum, c) => sum + c.unrealizedPnL, 0) * 100) / kpis.totalAUM : 0;
        const opportunity = clients.filter((c) => c.diversificationScore >= 70 && c.status === "active").length;
        const risk = clients.filter((c) => c.concentrationRisk.toLowerCase().includes("high")).length;
        return [
          { label: "Portfolio Growth Signal", value: `${growth.toFixed(1)}%`, tone: growth >= 0 ? "success" : "warn" },
          { label: "Opportunity Signals", value: String(opportunity), tone: "info" },
          { label: "Risk Flags", value: String(risk), tone: risk > 0 ? "warn" : "success" },
        ];
      }}
      workflow={[
        "Merge investment, real estate, and engagement data streams.",
        "Generate predictive signals for growth and risk movement.",
        "Publish ranked recommendations into admin workflows.",
      ]}
    />
  );
}
