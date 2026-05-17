export type AdminNavItem = {
  href: string;
  label: string;
  shortLabel: string;
  description: string;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    href: "/admin",
    label: "Overview",
    shortLabel: "Overview",
    description: "Platform intelligence and operational command center",
  },
  {
    href: "/admin/clients",
    label: "Client Operations",
    shortLabel: "Clients",
    description: "Client Operations Center: lifecycle, approvals, and relationship command",
  },
  {
    href: "/admin/assets",
    label: "Asset Intelligence",
    shortLabel: "Assets",
    description: "Holdings orchestration, valuation intelligence, and exposure control",
  },
  {
    href: "/admin/real-estate",
    label: "Real Estate",
    shortLabel: "Real Estate",
    description: "Real Estate Operations: tenant, lease, collection, and maintenance workflows",
  },
  {
    href: "/admin/transactions",
    label: "Approval Workflows",
    shortLabel: "Approvals",
    description: "Operational approvals, exceptions, and execution queues",
  },
  {
    href: "/admin/insights",
    label: "Advisory Workspace",
    shortLabel: "Advisory",
    description: "Advisor recommendations, planning context, and follow-up operations",
  },
  {
    href: "/admin/risk",
    label: "Risk Intelligence",
    shortLabel: "Risk",
    description: "AI-driven risk scoring, concentration alerts and rebalance signals",
  },
  {
    href: "/admin/notifications",
    label: "Communication Center",
    shortLabel: "Comms",
    description: "WhatsApp, email, call, reminder, and notification operations",
  },
  {
    href: "/admin/activity",
    label: "Activity",
    shortLabel: "Activity",
    description: "Cross-module audit timeline",
  },
  {
    href: "/admin/vendors",
    label: "Vendors",
    shortLabel: "Vendors",
    description: "External partner orchestration",
  },
  {
    href: "/admin/reports",
    label: "Reporting & Exports",
    shortLabel: "Reports",
    description: "PDF, CSV, and XLSX reporting operations with enterprise snapshots",
  },
  {
    href: "/admin/system-settings",
    label: "System Operations",
    shortLabel: "System",
    description: "Policy controls, runtime posture, and operating environment health",
  },
];

export function getAdminNavMeta(pathname: string) {
  const active =
    ADMIN_NAV_ITEMS.find((item) =>
      item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href)
    ) ?? ADMIN_NAV_ITEMS[0];

  return active;
}
