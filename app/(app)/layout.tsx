"use client";

import { AuthenticatedAppRouteShell } from "@/components/app-shell/AuthenticatedAppRouteShell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedAppRouteShell>{children}</AuthenticatedAppRouteShell>;
}
