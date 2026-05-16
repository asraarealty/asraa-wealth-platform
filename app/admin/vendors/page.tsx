import { AdminModulePage } from "@/components/admin-os/AdminModulePage";

export default function AdminVendorsPage() {
  return (
    <AdminModulePage
      title="Vendors"
      description="Manage external partners, service SLAs, and integration performance across institutional operations."
      metrics={[
        { label: "Active Vendors", value: "22", tone: "info" },
        { label: "SLA Breaches", value: "2", tone: "warn" },
        { label: "Healthy Integrations", value: "95%", tone: "success" },
      ]}
      workflow={[
        "Track vendor obligations, incidents, and service-level adherence.",
        "Measure connector reliability for external systems.",
        "Escalate contract or performance risks to operations leadership.",
      ]}
    />
  );
}
