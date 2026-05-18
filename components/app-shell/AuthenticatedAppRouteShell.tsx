"use client";

import { usePathname } from "next/navigation";
import { DashboardProvider } from "@/context/DashboardContext";
import { AppChrome } from "@/components/app-shell/AppChrome";

export function AuthenticatedAppRouteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const needsDashboardProvider =
    pathname === "/dashboard" ||
    pathname === "/insights" ||
    pathname === "/real-estate" ||
    pathname === "/notifications" ||
    pathname === "/activity" ||
    pathname === "/transactions";

  if (!needsDashboardProvider) {
    return <AppChrome>{children}</AppChrome>;
  }

  return (
    <DashboardProvider>
      <AppChrome>{children}</AppChrome>
    </DashboardProvider>
  );
}
