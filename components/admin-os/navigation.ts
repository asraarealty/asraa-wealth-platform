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
    label: "Clients",
    shortLabel: "Clients",
    description: "Lifecycle and relationship operations",
  },
  {
    href: "/admin/assets",
    label: "Assets",
    shortLabel: "Assets",
    description: "Allocation and performance orchestration",
  },
  {
    href: "/admin/real-estate",
    label: "Real Estate",
    shortLabel: "Real Estate",
    description: "Property operations and occupancy control",
  },
  {
    href: "/admin/transactions",
    label: "Transactions",
    shortLabel: "Transactions",
    description: "Settlement monitoring and exceptions",
  },
  {
    href: "/admin/insights",
    label: "Insights",
    shortLabel: "Insights",
    description: "Growth signals and predictive analytics",
  },
  {
    href: "/admin/notifications",
    label: "Notifications",
    shortLabel: "Notifications",
    description: "Event routing and audience delivery",
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
    label: "Reports",
    shortLabel: "Reports",
    description: "Executive and regulatory exports",
  },
  {
    href: "/admin/system-settings",
    label: "System Settings",
    shortLabel: "Settings",
    description: "Platform policy and runtime controls",
  },
];

export function getAdminNavMeta(pathname: string) {
  const active =
    ADMIN_NAV_ITEMS.find((item) =>
      item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href)
    ) ?? ADMIN_NAV_ITEMS[0];

  return active;
}
