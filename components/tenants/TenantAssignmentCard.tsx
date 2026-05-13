"use client";

import { useState } from "react";

export default function TenantAssignmentCard({
  onAssign,
  assigning,
}: {
  onAssign: (tenantId: number, propertyId: number) => Promise<void>;
  assigning?: boolean;
}) {
  const [tenantId, setTenantId] = useState("");
  const [propertyId, setPropertyId] = useState("");

  return (
    <div className="glass-card rounded-2xl border border-white/10 p-5">
      <p className="text-[11px] uppercase tracking-widest text-white/45 font-semibold">Tenant Assignment</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
        <input
          className="neon-input rounded-xl px-3 py-2.5 text-sm"
          placeholder="Tenant ID"
          value={tenantId}
          onChange={(event) => setTenantId(event.target.value)}
        />
        <input
          className="neon-input rounded-xl px-3 py-2.5 text-sm"
          placeholder="Property ID"
          value={propertyId}
          onChange={(event) => setPropertyId(event.target.value)}
        />
        <button
          type="button"
          disabled={assigning || Number(tenantId) <= 0 || Number(propertyId) <= 0}
          className="neon-btn rounded-xl px-4 py-2.5 text-sm disabled:opacity-45"
          onClick={() => void onAssign(Number(tenantId), Number(propertyId))}
        >
          {assigning ? "Assigning…" : "Assign Tenant"}
        </button>
      </div>
    </div>
  );
}
