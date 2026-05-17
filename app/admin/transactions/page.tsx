"use client";

import { LiveAdminModulePage } from "@/components/admin-os/LiveAdminModulePage";

export default function AdminTransactionsPage() {
  return (
    <LiveAdminModulePage
      title="Transactions"
      description="Monitor transaction flow, reconciliations, and exception handling across all investment products."
      buildMetrics={(clients) => {
        const turnover = clients.reduce((sum, c) => sum + Math.abs(c.unrealizedPnL), 0);
        const inactive = clients.filter((c) => c.status === "inactive" || c.status === "suspended").length;
        const stable = clients.length ? ((clients.length - inactive) * 100) / clients.length : 100;
        return [
          { label: "Monitored Turnover", value: new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", notation: "compact", maximumFractionDigits: 1 }).format(turnover), tone: "info" },
          { label: "Operational Exceptions", value: String(inactive), tone: inactive > 0 ? "warn" : "success" },
          { label: "Stable Accounts", value: `${stable.toFixed(1)}%`, tone: "success" },
        ];
      }}
      workflow={[
        "Ingest transaction events from platform and banking connectors.",
        "Run validation rules for settlement, pricing, and authorization.",
        "Route unresolved exceptions to compliance and treasury queues.",
      ]}
    />
  );
}
