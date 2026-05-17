import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin-os/AdminSidebar";
import { AdminHeader } from "@/components/admin-os/AdminHeader";

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#07080d] text-white">
      <div className="flex min-h-screen">
        <AdminSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <AdminHeader />
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
