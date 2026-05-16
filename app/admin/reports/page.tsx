import { AdminModulePage } from "@/components/admin-os/AdminModulePage";

export default function AdminReportsPage() {
  return (
    <AdminModulePage
      title="Reports"
      description="Generate executive, investor, and regulatory reporting from centralized platform intelligence."
      metrics={[
        { label: "Scheduled Reports", value: "41", tone: "info" },
        { label: "On-time Delivery", value: "98.9%", tone: "success" },
        { label: "Review Required", value: "5", tone: "warn" },
      ]}
      workflow={[
        "Assemble validated data snapshots from all operating modules.",
        "Apply templates for executive, investor, and compliance reporting.",
        "Distribute outputs with audit metadata and version control.",
      ]}
    />
  );
}
