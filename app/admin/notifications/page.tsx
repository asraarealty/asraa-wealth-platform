"use client";

import { LiveAdminModulePage } from "@/components/admin-os/LiveAdminModulePage";

export default function AdminNotificationsPage() {
  return (
    <LiveAdminModulePage
      title="Notifications"
      description="Coordinate event campaigns, alerts, and customer-facing communications with policy controls."
      buildMetrics={(clients) => {
        const channels = clients.filter((c) => c.notificationPreferences.email || c.notificationPreferences.whatsapp || c.notificationPreferences.sms || c.notificationPreferences.push).length;
        const withPhone = clients.filter((c) => Boolean(c.phone || c.whatsapp)).length;
        const escalation = clients.filter((c) => c.status === "suspended" || c.status === "archived").length;
        return [
          { label: "Contactable Clients", value: String(withPhone), tone: "info" },
          { label: "Notification Routing Enabled", value: `${clients.length ? ((channels * 100) / clients.length).toFixed(1) : "0.0"}%`, tone: "success" },
          { label: "Escalations", value: String(escalation), tone: escalation > 0 ? "warn" : "success" },
        ];
      }}
      workflow={[
        "Collect triggers from transactions, property operations, and risk engines.",
        "Apply audience and compliance rules before dispatch.",
        "Track delivery outcomes and escalate failed critical events.",
      ]}
    />
  );
}
