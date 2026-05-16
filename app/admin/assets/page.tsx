import { AdminModulePage } from "@/components/admin-os/AdminModulePage";

export default function AdminAssetsPage() {
  return (
    <AdminModulePage
      title="Assets"
      description="Monitor allocation strategy, concentration risk, and portfolio drift across all managed accounts."
      metrics={[
        { label: "Tracked Assets", value: "624", tone: "info" },
        { label: "Allocation Drift", value: "7.3%", tone: "warn" },
        { label: "Rebalance Tasks", value: "18", tone: "success" },
      ]}
      workflow={[
        "Aggregate holdings across clients and custodial sources.",
        "Detect distribution variance against policy targets.",
        "Queue rebalance instructions for review and execution.",
      ]}
    />
  );
}
