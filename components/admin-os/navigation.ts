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
    description: "Operational command center and priority queue",
  },
  {
    href: "/admin/clients",
    label: "Clients",
    shortLabel: "Clients",
    description: "Client operations, lifecycle status, and relationship oversight",
  },
  {
    href: "/admin/onboarding",
    label: "Onboarding",
    shortLabel: "Onboarding",
    description: "Onboarding pipeline and completion readiness",
  },
  {
    href: "/admin/market",
    label: "Market Terminal",
    shortLabel: "Market",
    description: "Market Intelligence terminal with live search and monitoring",
  },
  {
    href: "/admin/assets",
    label: "Portfolio Intelligence",
    shortLabel: "Portfolio",
    description: "Portfolio Intelligence for allocation, exposure, and drift",
  },
  {
    href: "/admin/real-estate",
    label: "Real Estate Intelligence",
    shortLabel: "Real Estate",
    description: "Real Estate Intelligence for leases, occupancy, and operations",
  },
  {
    href: "/admin/transactions",
    label: "Approvals",
    shortLabel: "Approvals",
    description: "Operational approvals, exceptions, and execution queues",
  },
  {
    href: "/admin/reports",
    label: "Reports",
    shortLabel: "Reports",
    description: "Reporting and exports for operational governance",
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
