"use client";

import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import ApprovalGuard from "@/components/ApprovalGuard";
import Loader from "@/components/ui/Loader";

function DashboardAuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user === null) {
      window.location.href = "/login";
    }
  }, [loading, user]);

  if (loading) return <Loader />;
  if (!user) return null;

  return <>{children}</>;
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardAuthGuard>
      <ApprovalGuard>{children}</ApprovalGuard>
    </DashboardAuthGuard>
  );
}
