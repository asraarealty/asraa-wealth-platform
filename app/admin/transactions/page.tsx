import { AdminModulePage } from "@/components/admin-os/AdminModulePage";

export default function AdminTransactionsPage() {
  return (
    <AdminModulePage
      title="Transactions"
      description="Monitor transaction flow, reconciliations, and exception handling across all investment products."
      metrics={[
        { label: "Daily Volume", value: "₹1.89Cr", tone: "info" },
        { label: "Exceptions", value: "23", tone: "warn" },
        { label: "Reconciled", value: "98.7%", tone: "success" },
      ]}
      workflow={[
        "Ingest transaction events from platform and banking connectors.",
        "Run validation rules for settlement, pricing, and authorization.",
        "Route unresolved exceptions to compliance and treasury queues.",
      ]}
    />
  );
}
