"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

const STEPS = [
  "Property details",
  "Tenant assignment",
  "Lease configuration",
  "Rent settings",
  "Documents/photos",
] as const;

function toInitial(property?: PropertySummary): PropertyFormValues {
  if (!property) {
    return {
      name: "",
      type: "commercial",
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
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!open) return;
    setValues(toInitial(property));
    setError(null);
    setStep(0);
  }, [open, property]);

  const title = property ? "Edit Property" : "Add Property";

  const canSubmit = useMemo(() => {
    return Boolean(
      values.name.trim() &&
        values.address.trim() &&
        Number(values.purchaseValue) > 0 &&
        Number(values.currentValue) > 0
    );
  }, [values]);

  // canProceedToSubmit is true when all required fields are complete (allow saving
  // from any step) OR when on the last wizard step (force save attempt).
  const canProceedToSubmit = canSubmit || step === STEPS.length - 1;

  const missingRequiredFields = useMemo(() => {
    const missing: string[] = [];
    if (!values.name.trim()) missing.push("Property Name");
    if (!values.address.trim()) missing.push("Address");
    if (!(Number(values.purchaseValue) > 0)) missing.push("Purchase Value");
    if (!(Number(values.currentValue) > 0)) missing.push("Current Value");
    return missing;
  }, [values.address, values.currentValue, values.name, values.purchaseValue]);

  if (!open) return null;

  return (
    <Modal title={title} onClose={onClose} width="w-[96vw] sm:w-full sm:max-w-2xl">
      <div className="space-y-4">
        <div className="grid grid-cols-5 gap-2">
          {STEPS.map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(index)}
              className="rounded-lg px-2 py-2 text-[11px] leading-tight text-left border"
              style={{
                borderColor: index <= step ? "rgba(201,162,39,0.35)" : "rgba(255,255,255,0.1)",
                background: index === step ? "rgba(201,162,39,0.12)" : "rgba(255,255,255,0.03)",
                color: index === step ? "#d4af4a" : "rgba(255,255,255,0.65)",
              }}
            >
              {index + 1}. {label}
            </button>
          ))}
        </div>

        {step === 0 ? (
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
                <option value="commercial">Commercial</option>
                <option value="residential">Residential</option>
                <option value="industrial">Industrial</option>
                <option value="warehouse">Warehouse</option>
                <option value="office">Office</option>
                <option value="retail">Retail</option>
                <option value="land">Land</option>
                <option value="hospitality">Hospitality</option>
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
        ) : null}

        {step === 1 ? (
          <div className="glass-card rounded-2xl border border-white/10 p-4">
            <p className="text-sm text-white/85">Tenant assignment is handled in the dedicated tenant module.</p>
            <p className="text-xs text-white/45 mt-1">After property save, assign tenant from operations.</p>
            <Link href="/tenants" className="inline-flex mt-3 text-sm text-cyan-300 font-semibold">
              Open Tenants →
            </Link>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="glass-card rounded-2xl border border-white/10 p-4">
            <p className="text-sm text-white/85">Lease configuration is managed in the lease workflow.</p>
            <p className="text-xs text-white/45 mt-1">Define tenure, lock-in, escalation and renewal terms from Lease Management.</p>
            <Link href="/leases" className="inline-flex mt-3 text-sm text-cyan-300 font-semibold">
              Open Leases →
            </Link>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="glass-card rounded-2xl border border-white/10 p-4">
            <p className="text-sm text-white/85">Rent settings are configured in rent operations.</p>
            <p className="text-xs text-white/45 mt-1">Set rent ledger cadence, tracking, and collection status from Rent module.</p>
            <Link href="/rent" className="inline-flex mt-3 text-sm text-cyan-300 font-semibold">
              Open Rent →
            </Link>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="glass-card rounded-2xl border border-white/10 p-4">
            <p className="text-sm text-white/85">Documents and photos are tracked in operations after property save.</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link href="/properties" className="text-sm text-cyan-300 font-semibold">
                Open Properties →
              </Link>
              <Link href="/maintenance" className="text-sm text-cyan-300 font-semibold">
                Open Maintenance →
              </Link>
            </div>
          </div>
        ) : null}

        {error ? <FormError>{error}</FormError> : null}
      </div>

      <ModalFooter
        onCancel={step === 0 ? onClose : () => setStep((current) => Math.max(0, current - 1))}
        cancelLabel={step === 0 ? "Cancel" : "Back"}
        onSave={() => {
          if (!canProceedToSubmit) {
            setStep((current) => Math.min(STEPS.length - 1, current + 1));
            return;
          }
          if (!canSubmit) {
            setError(`Returning to Property details. Please complete: ${missingRequiredFields.join(", ")}.`);
            setStep(0);
            return;
          }
          setError(null);
          void onSubmit(values).catch((err) =>
            setError(err instanceof Error ? err.message : "Unable to save property")
          );
        }}
        saveLabel={canProceedToSubmit ? (property ? "Update Property" : "Create Property") : "Next"}
        saving={submitting}
      />
    </Modal>
  );
}
