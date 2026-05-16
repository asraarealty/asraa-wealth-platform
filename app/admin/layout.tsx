"use client";

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
        className="flex h-screen overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #040915 0%, #0a1633 58%, #102451 100%)",
        }}
      >
        {/* Sidebar */}
        <Sidebar />

        {/* Main Area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Header */}
          <AdminHeader />

          {/* Content */}
          <main className="flex-1 overflow-y-auto p-6 md:p-8">
            {children}
          </main>
        </div>
      </div>
    </AdminAuthGuard>
  );
}
