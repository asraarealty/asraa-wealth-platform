"use client";

import React from "react";
import AdminAuthGuard from "@/components/admin/AdminAuthGuard";
import { AdminShell } from "@/components/admin-os/AdminShell";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthGuard>
      <AdminShell>{children}</AdminShell>
    </AdminAuthGuard>
  );
}
