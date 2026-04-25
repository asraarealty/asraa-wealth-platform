import React from "react";
import Sidebar from "@/components/admin/Sidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import AdminAuthGuard from "@/components/admin/AdminAuthGuard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthGuard>
      <div
        className="flex flex-col min-h-screen"
        style={{ background: "linear-gradient(135deg, #0b3d2e 0%, #0a0f0d 60%, #0b3d2e 100%)" }}
      >
        <AdminHeader />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-6 md:p-8">{children}</main>
        </div>
      </div>
    </AdminAuthGuard>
  );
}
