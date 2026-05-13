"use client";

import Link from "next/link";
import type { Asset, CreateAssetPayload, UpdateAssetPayload } from "@/lib/api";

interface RealEstateTabProps {
  assets: Asset[];
  onAdd: (payload: CreateAssetPayload) => Promise<void>;
  onEdit: (id: number, payload: UpdateAssetPayload) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

const OPERATIONS_LINKS = [
  { href: "/properties", label: "Properties", hint: "Portfolio properties and details" },
  { href: "/tenants", label: "Tenants", hint: "Assignment and tenant lifecycle" },
  { href: "/leases", label: "Leases", hint: "Expiry, renewal and lock-in" },
  { href: "/rent", label: "Rent", hint: "Collection trends and ledger" },
  { href: "/maintenance", label: "Maintenance", hint: "Tickets and work orders" },
  { href: "/reports", label: "Reports", hint: "Operations analytics dashboard" },
];

export default function RealEstateTab({ assets }: RealEstateTabProps) {
  const propertiesCount = assets.filter((a) => a.type === "property").length;

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-2xl p-5 border border-white/10">
        <p className="text-sm text-white/80 font-semibold">Real Estate Operations</p>
        <p className="text-xs text-white/50 mt-1">
          Unified flow is now handled through the dedicated commercial operations routes.
        </p>
        <p className="text-xs text-white/45 mt-2">
          Portfolio properties tracked: <span className="text-white/80 font-semibold">{propertiesCount}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {OPERATIONS_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="glass-card rounded-2xl p-4 border border-white/10 hover:border-cyan-300/35 transition-colors"
          >
            <p className="text-sm font-semibold text-white">{item.label}</p>
            <p className="text-xs text-white/45 mt-1">{item.hint}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
