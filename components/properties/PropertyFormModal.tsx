"use client";

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

type WorkflowValues = PropertyFormValues & {
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string;
  leaseStartDate: string;
  leaseEndDate: string;
  lockInMonths: string;
  monthlyRent: string;
  securityDeposit: string;
  documentsNote: string;
  photosNote: string;
};

const STEPS = [
  "Property details",
  "Tenant assignment",
  "Lease configuration",
  "Rent settings",
  "Documents/photos",
] as const;

function toInitial(property?: PropertySummary): WorkflowValues {
  if (!property) {
    return {
      name: "",
      type: "office",
      address: "",
      occupancyStatus: "partially_occupied",
      lifecycleStage: "operational",
      purchaseValue: "",
      currentValue: "",
      tenantName: "",
      tenantEmail: "",
      tenantPhone: "",
      leaseStartDate: "",
      leaseEndDate: "",
      lockInMonths: "",
      monthlyRent: "",
      securityDeposit: "",
      documentsNote: "",
      photosNote: "",
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
    tenantName: "",
    tenantEmail: "",
    tenantPhone: "",
    leaseStartDate: "",
    leaseEndDate: "",
    lockInMonths: "",
    monthlyRent: "",
    securityDeposit: "",
    documentsNote: "",
    photosNote: "",
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
  const [values, setValues] = useState<WorkflowValues>(() => toInitial(property));
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!open) return;
    setValues(toInitial(property));
    setError(null);
    setStep(0);
  }, [open, property]);

  const title = property ? "Edit Property" : "Add Property";
  const isLast = step === STEPS.length - 1;

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
        ) : null}

        {step === 1 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Tenant Name">
              <FieldInput value={values.tenantName} onChange={(tenantName) => setValues((prev) => ({ ...prev, tenantName }))} placeholder="Acme Corp" />
            </FormField>
            <FormField label="Tenant Email">
              <FieldInput type="email" value={values.tenantEmail} onChange={(tenantEmail) => setValues((prev) => ({ ...prev, tenantEmail }))} placeholder="ops@acme.com" />
            </FormField>
            <FormField label="Tenant Phone">
              <FieldInput value={values.tenantPhone} onChange={(tenantPhone) => setValues((prev) => ({ ...prev, tenantPhone }))} placeholder="+91 90000 00000" />
            </FormField>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Lease Start">
              <FieldInput type="date" value={values.leaseStartDate} onChange={(leaseStartDate) => setValues((prev) => ({ ...prev, leaseStartDate }))} />
            </FormField>
            <FormField label="Lease End">
              <FieldInput type="date" value={values.leaseEndDate} onChange={(leaseEndDate) => setValues((prev) => ({ ...prev, leaseEndDate }))} />
            </FormField>
            <FormField label="Lock-in (months)">
              <FieldInput type="number" value={values.lockInMonths} onChange={(lockInMonths) => setValues((prev) => ({ ...prev, lockInMonths }))} placeholder="24" />
            </FormField>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Monthly Rent">
              <FieldInput type="number" value={values.monthlyRent} onChange={(monthlyRent) => setValues((prev) => ({ ...prev, monthlyRent }))} placeholder="250000" />
            </FormField>
            <FormField label="Security Deposit">
              <FieldInput type="number" value={values.securityDeposit} onChange={(securityDeposit) => setValues((prev) => ({ ...prev, securityDeposit }))} placeholder="1000000" />
            </FormField>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Documents">
              <FieldInput value={values.documentsNote} onChange={(documentsNote) => setValues((prev) => ({ ...prev, documentsNote }))} placeholder="Lease, title deed, tax docs" />
            </FormField>
            <FormField label="Photos">
              <FieldInput value={values.photosNote} onChange={(photosNote) => setValues((prev) => ({ ...prev, photosNote }))} placeholder="Lobby, facade, unit interiors" />
            </FormField>
          </div>
        ) : null}

        {error ? <FormError>{error}</FormError> : null}
      </div>

      <ModalFooter
        onCancel={step === 0 ? onClose : () => setStep((current) => Math.max(0, current - 1))}
        cancelLabel={step === 0 ? "Cancel" : "Back"}
        onSave={() => {
          if (!isLast) {
            setStep((current) => Math.min(STEPS.length - 1, current + 1));
            return;
          }
          if (!canSubmit) {
            setError("Fill all required property fields with valid values before saving.");
            setStep(0);
            return;
          }
          setError(null);
          void onSubmit({
            name: values.name,
            type: values.type,
            address: values.address,
            occupancyStatus: values.occupancyStatus,
            lifecycleStage: values.lifecycleStage,
            purchaseValue: values.purchaseValue,
            currentValue: values.currentValue,
          }).catch((err) => setError(err instanceof Error ? err.message : "Unable to save property"));
        }}
        saveLabel={isLast ? (property ? "Update Property" : "Create Property") : "Next"}
        saving={submitting}
      />
    </Modal>
  );
}
