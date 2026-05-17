"use client";

import { DashboardProvider } from "@/context/DashboardContext";
import { AppChrome } from "@/components/app-shell/AppChrome";

export function AuthenticatedAppRouteShell({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <AppChrome>{children}</AppChrome>
    </DashboardProvider>
  );
}
