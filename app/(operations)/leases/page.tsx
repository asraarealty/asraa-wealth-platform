"use client";

import { useMemo } from "react";
import { useLease, useLeases } from "@/hooks/useRealEstate";
import LeasesTable from "@/components/leases/LeasesTable";
import LeaseTimeline from "@/components/leases/LeaseTimeline";

export default function LeasesPage() {
  const { data, loading, error, refresh } = useLeases();
  const expiringLeaseId = useMemo(() => data.find((lease) => lease.status === "expiring")?.id ?? data[0]?.id, [data]);
  const leaseState = useLease(expiringLeaseId);

  return (
    <div className="space-y-4 sm:space-y-5">
      <div>
        <h2 className="text-lg sm:text-xl text-white font-semibold">Lease Management</h2>
        <p className="text-sm text-white/45">Lease lifecycle, expiry alerts, renewals, escalation, and lock-in visibility</p>
      </div>

      {error ? (
        <div className="glass-card border border-red-400/30 rounded-2xl p-4 text-sm text-red-200 flex items-center justify-between gap-3">
          <span>{error}</span>
          <button type="button" onClick={() => void refresh()} className="text-red-200 font-semibold">Retry</button>
        </div>
      ) : null}

      {loading ? <div className="glass-card rounded-2xl border border-white/10 h-56 animate-pulse" /> : <LeasesTable leases={data} />}

      {!leaseState.loading && !leaseState.error && leaseState.data.id > 0 ? <LeaseTimeline lease={leaseState.data} /> : null}
    </div>
  );
}
