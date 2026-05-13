"use client";

import { useMemo, useState } from "react";
import Modal, { FieldInput, FormError, FormField, ModalFooter } from "@/components/dashboard/modals/Modal";
import type { OccupancyStatus, PropertyLifecycleStage, PropertySummary, PropertyType } from "@/lib/types/realEstate";

export type PropertyFormValues = {
  name: string;
  type: PropertyType;
  address: string;
  occupancyStatus: OccupancyStatus;
  lifecycleStage: PropertyLifecycleStage;
  purchaseValue: string;
  currentValue: string;
};

function toInitial(property?: PropertySummary): PropertyFormValues {
  if (!property) {
    return {
      name: "",
      type: "office",
      address: "",
      occupancyStatus: "partially_occupied",
      lifecycleStage: "operational",
      purchaseValue: "",
      currentValue: "",
    };
  }

  return {
    name: property.name,
    type: property.type,
    address: property.address,
    occupancyStatus: property.occupancyStatus,
    lifecycleStage: property.lifecycleStage,
    purchaseValue: String(property.purchaseValue),
    currentValue: String(property.currentValue),
  };
}

export default function PropertyFormModal({
  open,
  property,
  submitting,
  onClose,
  onSubmit,
}: {
  open: boolean;
  property?: PropertySummary;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (values: PropertyFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<PropertyFormValues>(() => toInitial(property));
  const [error, setError] = useState<string | null>(null);

  const title = property ? "Edit Property" : "Add Property";

  const canSubmit = useMemo(() => {
    return Boolean(
      values.name.trim() &&
        values.address.trim() &&
        Number(values.purchaseValue) > 0 &&
        Number(values.currentValue) > 0
    );
  }, [values]);

  if (!open) return null;

  return (
    <Modal title={title} onClose={onClose} width="w-[96vw] sm:w-full sm:max-w-2xl">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Property Name" required>
            <FieldInput value={values.name} onChange={(name) => setValues((prev) => ({ ...prev, name }))} placeholder="Asraa Business Park" />
          </FormField>
          <FormField label="Property Type" required>
            <select
              className="w-full px-3 py-2.5 text-sm rounded-xl gold-input"
              value={values.type}
              onChange={(event) => setValues((prev) => ({ ...prev, type: event.target.value as PropertyType }))}
            >
              <option value="office">Office</option>
              <option value="retail">Retail</option>
              <option value="warehouse">Warehouse</option>
              <option value="industrial">Industrial</option>
              <option value="mixed_use">Mixed Use</option>
              <option value="other">Other</option>
            </select>
          </FormField>
          <FormField label="Address" required>
            <FieldInput value={values.address} onChange={(address) => setValues((prev) => ({ ...prev, address }))} placeholder="BKC, Mumbai" />
          </FormField>
          <FormField label="Occupancy Status" required>
            <select
              className="w-full px-3 py-2.5 text-sm rounded-xl gold-input"
              value={values.occupancyStatus}
              onChange={(event) => setValues((prev) => ({ ...prev, occupancyStatus: event.target.value as OccupancyStatus }))}
            >
              <option value="fully_occupied">Fully Occupied</option>
              <option value="partially_occupied">Partially Occupied</option>
              <option value="vacant">Vacant</option>
            </select>
          </FormField>
          <FormField label="Lifecycle Stage" required>
            <select
              className="w-full px-3 py-2.5 text-sm rounded-xl gold-input"
              value={values.lifecycleStage}
              onChange={(event) => setValues((prev) => ({ ...prev, lifecycleStage: event.target.value as PropertyLifecycleStage }))}
            >
              <option value="acquired">Acquired</option>
              <option value="stabilizing">Stabilizing</option>
              <option value="operational">Operational</option>
              <option value="value_add">Value Add</option>
              <option value="exit_ready">Exit Ready</option>
            </select>
          </FormField>
          <FormField label="Purchase Value" required>
            <FieldInput type="number" value={values.purchaseValue} onChange={(purchaseValue) => setValues((prev) => ({ ...prev, purchaseValue }))} placeholder="120000000" />
          </FormField>
          <FormField label="Current Value" required>
            <FieldInput type="number" value={values.currentValue} onChange={(currentValue) => setValues((prev) => ({ ...prev, currentValue }))} placeholder="140000000" />
          </FormField>
        </div>
        {error ? <FormError>{error}</FormError> : null}
      </div>
      <ModalFooter
        onCancel={onClose}
        onSave={() => {
          if (!canSubmit) {
            setError("Fill all required fields with valid values.");
            return;
          }
          setError(null);
          void onSubmit(values).catch((err) => setError(err instanceof Error ? err.message : "Unable to save property"));
        }}
        saveLabel={property ? "Update Property" : "Create Property"}
        saving={submitting}
      />
    </Modal>
  );
}
