"use client";

import { useState } from "react";
import { useToast } from "@/context/ToastContext";
import { assignTenantToProperty } from "@/lib/api/realEstate";
import { useTenants } from "@/hooks/useRealEstate";
import TenantsTable from "@/components/tenants/TenantsTable";
import TenantAssignmentCard from "@/components/tenants/TenantAssignmentCard";

export default function TenantsPage() {
  const { showToast } = useToast();
  const { data, loading, error, refresh } = useTenants();
  const [assigning, setAssigning] = useState(false);

  async function onAssign(tenantId: number, propertyId: number) {
    setAssigning(true);
    try {
      await assignTenantToProperty({
        id: tenantId,
        clientId: 1,
        propertyId,
        status: "active",
        companyName: "",
        contactName: "",
        email: "",
        phone: "",
        rentAmount: 0,
        leaseStartDate: "",
        leaseEndDate: "",
      });
      showToast("Tenant assignment updated", "success");
      await refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Unable to assign tenant", "error");
    } finally {
      setAssigning(false);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div>
        <h2 className="text-lg sm:text-xl text-white font-semibold">Tenant Management</h2>
        <p className="text-sm text-white/45">Active/inactive tenants, assignment workflow, and tenant history access</p>
      </div>

      <TenantAssignmentCard assigning={assigning} onAssign={onAssign} />

      {error ? (
        <div className="glass-card border border-red-400/30 rounded-2xl p-4 text-sm text-red-200 flex items-center justify-between gap-3">
          <span>{error}</span>
          <button type="button" onClick={() => void refresh()} className="text-red-200 font-semibold">Retry</button>
        </div>
      ) : null}

      {loading ? (
        <div className="glass-card rounded-2xl border border-white/10 p-5 h-56 animate-pulse" />
      ) : (
        <TenantsTable tenants={data} />
      )}
    </div>
  );
}
