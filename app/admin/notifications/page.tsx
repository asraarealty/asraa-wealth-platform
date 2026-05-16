import { AdminModulePage } from "@/components/admin-os/AdminModulePage";

export default function AdminNotificationsPage() {
  return (
    <AdminModulePage
      title="Notifications"
      description="Coordinate event campaigns, alerts, and customer-facing communications with policy controls."
      metrics={[
        { label: "Queued Events", value: "76", tone: "info" },
        { label: "Delivery Success", value: "99.1%", tone: "success" },
        { label: "Escalations", value: "6", tone: "warn" },
      ]}
      workflow={[
        "Collect triggers from transactions, property operations, and risk engines.",
        "Apply audience and compliance rules before dispatch.",
        "Track delivery outcomes and escalate failed critical events.",
      ]}
    />
  );
}
