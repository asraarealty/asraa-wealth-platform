"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { createProperty, updateProperty } from "@/lib/api/realEstate";
import { useProperties } from "@/hooks/useRealEstate";
import { useRealEstateCategory } from "@/hooks/useRealEstateCategory";
import type { PropertySummary } from "@/lib/types/realEstate";
import { calculateRoiPercent } from "@/lib/utils/realEstate";
import { emitRealEstateDataUpdated } from "@/lib/events/realtime";
import PropertyAnalyticsCards from "@/components/properties/PropertyAnalyticsCards";
import PropertyFormModal, { type PropertyFormValues } from "@/components/properties/PropertyFormModal";
import RealEstateCategorySwitcher from "@/components/properties/RealEstateCategorySwitcher";

const PropertiesTable = dynamic(() => import("@/components/properties/PropertiesTable"));

function SkeletonRows() {
  return (
    <div className="glass-card rounded-2xl border border-white/10 p-4 sm:p-5 space-y-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="h-12 rounded-xl bg-white/5 animate-pulse" />
      ))}
    </div>
  );
}

export default function PropertiesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { category, setCategory } = useRealEstateCategory();
  const { data, loading, error, retrying, refresh } = useProperties(category);

  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState<PropertySummary | undefined>(undefined);
  const [optimisticRows, setOptimisticRows] = useState<PropertySummary[] | null>(null);
  const tempIdRef = useRef(-1);

  const rows = optimisticRows ?? data;

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => b.currentValue - a.currentValue),
    [rows]
  );

  async function onSubmit(values: PropertyFormValues) {
    if (!user?.id) throw new Error("Client session is missing");

    const payload = {
      clientId: user.id,
      id: editing?.id,
      name: values.name,
      type: values.type,
      address: values.address,
      occupancyStatus: values.occupancyStatus,
      lifecycleStage: values.lifecycleStage,
      purchaseValue: values.purchaseValue,
      currentValue: values.currentValue,
    } as const;

    setSubmitting(true);

    const optimistic: PropertySummary = {
      id: editing?.id ?? tempIdRef.current--,
      name: values.name,
      type: values.type,
      address: values.address,
      occupancyStatus: values.occupancyStatus,
      lifecycleStage: values.lifecycleStage,
      purchaseValue: Number(values.purchaseValue),
      currentValue: Number(values.currentValue),
      roiPercent: calculateRoiPercent(Number(values.purchaseValue), Number(values.currentValue)),
      rentalYieldPercent: editing?.rentalYieldPercent ?? 0,
      noi: editing?.noi ?? 0,
      tenantStatus: editing?.tenantStatus ?? "0 active / 0 inactive",
    };

    const previous = rows;
    setOptimisticRows(
      editing
        ? rows.map((item) => (item.id === editing.id ? optimistic : item))
        : [optimistic, ...rows]
    );

    try {
      if (editing) {
        await updateProperty(payload);
        showToast("Property updated successfully", "success");
      } else {
        await createProperty(payload);
        showToast("Property added successfully", "success");
      }
      emitRealEstateDataUpdated();
      setModalOpen(false);
      setEditing(undefined);
      await refresh();
      setOptimisticRows(null);
    } catch (err) {
      setOptimisticRows(previous);
      throw err;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <PropertyAnalyticsCards properties={sortedRows} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl text-white font-semibold">Property Operations</h2>
          <p className="text-sm text-white/45">Track occupancy, lifecycle, unit economics, and documentation</p>
        </div>
        <RealEstateCategorySwitcher value={category} onChange={setCategory} />
        <button
          type="button"
          className="neon-btn rounded-xl px-4 py-2.5 text-sm font-semibold fixed bottom-4 right-4 sm:static z-20"
          onClick={() => {
            setEditing(undefined);
            setModalOpen(true);
          }}
        >
          + Add Property
        </button>
      </div>

      {error ? (
        <div className="glass-card border border-red-400/30 rounded-2xl p-4 text-sm text-red-200 flex items-center justify-between gap-3">
          <span>{error}</span>
          <button type="button" onClick={() => void refresh()} className="text-red-200 font-semibold">Retry</button>
        </div>
      ) : null}

      {loading ? <SkeletonRows /> : <PropertiesTable properties={sortedRows} />}

      {retrying ? <p className="text-xs text-white/45">Refreshing properties…</p> : null}

      <PropertyFormModal
        open={modalOpen}
        property={editing}
        submitting={submitting}
        onClose={() => setModalOpen(false)}
        onSubmit={onSubmit}
      />
    </div>
  );
}
