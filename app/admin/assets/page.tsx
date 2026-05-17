"use client";

import { LiveAdminModulePage } from "@/components/admin-os/LiveAdminModulePage";

export default function AdminAssetsPage() {
  return (
    <LiveAdminModulePage
      title="Assets"
      description="Monitor allocation strategy, concentration risk, and portfolio drift across all managed accounts."
      buildMetrics={(clients, kpis) => [
        { label: "Tracked Assets", value: String(clients.reduce((sum, c) => sum + c.assets.length, 0)), tone: "info" },
        { label: "Avg Equity Exposure", value: `${(clients.length ? clients.reduce((sum, c) => sum + c.equityExposurePct, 0) / clients.length : 0).toFixed(1)}%`, tone: "warn" },
        { label: "Managed AUM", value: new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", notation: "compact", maximumFractionDigits: 1 }).format(kpis.totalAUM), tone: "success" },
      ]}
      workflow={[
        "Aggregate holdings across clients and custodial sources.",
        "Detect distribution variance against policy targets.",
        "Queue rebalance instructions for review and execution.",
      ]}
    />
  );
}
