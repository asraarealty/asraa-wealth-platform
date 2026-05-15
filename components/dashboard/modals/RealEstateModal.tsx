"use client";

import { useState, useEffect } from "react";
import Modal, { FormField, FieldInput, ModalFooter, FormError } from "./Modal";
import TagSelect from "../TagSelect";
import type { Asset, CreateAssetPayload, UpdateAssetPayload } from "@/lib/api";

interface RealEstateModalProps {
  asset?: Asset | null;
  onClose: () => void;
  onSave: (payload: CreateAssetPayload | UpdateAssetPayload) => Promise<void>;
}

interface REForm {
  name: string;
  location: string;
  purchasePrice: string;
  currentValue: string;
  rentAmount: string;
  rentDueDate: string;
  tenantName: string;
  tenantPhone: string;
  tenantEmail: string;
  tags: string[];
}

interface REFieldErrors {
  name?: string;
  purchasePrice?: string;
  currentValue?: string;
  rentAmount?: string;
  tenantEmail?: string;
}

const EMPTY: REForm = {
  name: "",
  location: "",
  purchasePrice: "",
  currentValue: "",
  rentAmount: "",
  rentDueDate: "",
  tenantName: "",
  tenantPhone: "",
  tenantEmail: "",
  tags: [],
};

export default function RealEstateModal({
  asset,
  onClose,
  onSave,
}: RealEstateModalProps) {
  const isEdit = Boolean(asset);
  const [form, setForm] = useState<REForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<REFieldErrors>({});

  useEffect(() => {
    if (asset) {
      setForm({
        name: asset.name ?? "",
        location: asset.location ?? "",
        purchasePrice:
          asset.purchasePrice != null ? String(asset.purchasePrice) : "",
        currentValue:
          asset.currentValue != null ? String(asset.currentValue) : "",
        rentAmount:
          asset.rentAmount != null ? String(asset.rentAmount) : "",
        rentDueDate: asset.rentDueDate ?? "",
        tenantName: asset.tenantName ?? "",
        tenantPhone: asset.tenantPhone ?? "",
        tenantEmail: asset.tenantEmail ?? "",
        tags: asset.tags ?? [],
      });
    } else {
      setForm(EMPTY);
    }
    setError(null);
    setFieldErrors({});
  }, [asset]);

  function set(key: keyof REForm) {
    return (v: string) => setForm((f) => ({ ...f, [key]: v }));
  }

  function mapServerErrorToFieldErrors(message: string): REFieldErrors {
    const msg = message.toLowerCase();
    const next: REFieldErrors = {};
    if (msg.includes("name")) next.name = "Property name is required";
    if (msg.includes("purchase")) next.purchasePrice = "Purchase price is invalid";
    if (msg.includes("current")) next.currentValue = "Current value is invalid";
    if (msg.includes("rent")) next.rentAmount = "Rent amount is invalid";
    if (msg.includes("email")) next.tenantEmail = "Tenant email is invalid";
    return next;
  }

  async function handleSave() {
    if (saving) return;
    const name = form.name.trim();
    const purchasePrice = Number(form.purchasePrice);
    const currentValue = Number(form.currentValue);
    const rentAmount = form.rentAmount ? Number(form.rentAmount) : undefined;
    const nextFieldErrors: REFieldErrors = {};

    if (!name) nextFieldErrors.name = "Property name is required";
    if (!Number.isFinite(purchasePrice) || purchasePrice <= 0) {
      nextFieldErrors.purchasePrice = "Purchase price must be a positive number";
    }
    if (!Number.isFinite(currentValue) || currentValue <= 0) {
      nextFieldErrors.currentValue = "Current value must be a positive number";
    }
    if (
      rentAmount !== undefined &&
      (!Number.isFinite(rentAmount) || rentAmount < 0)
    ) {
      nextFieldErrors.rentAmount = "Rent amount must be a non-negative number";
    }
    if (form.tenantEmail.trim()) {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.tenantEmail.trim());
      if (!emailOk) {
        nextFieldErrors.tenantEmail = "Tenant email is invalid";
      }
    }

    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) {
      setError(null);
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await onSave({
        type: "property",
        name,
        location: form.location.trim() || undefined,
        purchasePrice,
        currentValue,
        avgPrice: purchasePrice,
        quantity: 1,
        rentAmount,
        rentDueDate: form.rentDueDate || undefined,
        tenantName: form.tenantName.trim() || undefined,
        tenantPhone: form.tenantPhone.trim() || undefined,
        tenantEmail: form.tenantEmail.trim() || undefined,
        tags: form.tags,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed";
      const mappedErrors = mapServerErrorToFieldErrors(message);
      if (Object.keys(mappedErrors).length > 0) {
        setFieldErrors((prev) => ({ ...prev, ...mappedErrors }));
        setError(null);
      } else {
        setError(message);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={isEdit ? "Edit Property" : "Add Real Estate"}
      onClose={onClose}
      width="w-[95vw] sm:w-full sm:max-w-lg"
    >
      <div className="space-y-4">
        {/* Property Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Property Name" required error={fieldErrors.name}>
            <FieldInput
              name="property-name"
              placeholder="Sunrise Villa"
              value={form.name}
              onChange={set("name")}
            />
          </FormField>
          <FormField label="Location">
            <FieldInput
              name="property-location"
              placeholder="Mumbai, Maharashtra"
              value={form.location}
              onChange={set("location")}
            />
          </FormField>
        </div>

        {/* Financials */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Purchase Price (₹)" required error={fieldErrors.purchasePrice}>
            <FieldInput
              name="purchase-price"
              type="number"
              min="0"
              step="1000"
              placeholder="5000000"
              value={form.purchasePrice}
              onChange={set("purchasePrice")}
            />
          </FormField>
          <FormField label="Current Value (₹)" required error={fieldErrors.currentValue}>
            <FieldInput
              name="current-value"
              type="number"
              min="0"
              step="1000"
              placeholder="6500000"
              value={form.currentValue}
              onChange={set("currentValue")}
            />
          </FormField>
        </div>

        {/* Rent */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Monthly Rent (₹)" error={fieldErrors.rentAmount}>
            <FieldInput
              name="rent-amount"
              type="number"
              min="0"
              step="100"
              placeholder="25000"
              value={form.rentAmount}
              onChange={set("rentAmount")}
            />
          </FormField>
          <FormField label="Rent Due Date">
            <FieldInput
              name="rent-due-date"
              type="date"
              value={form.rentDueDate}
              onChange={set("rentDueDate")}
            />
          </FormField>
        </div>

        {/* Divider */}
        <div
          className="text-xs font-semibold uppercase tracking-wider pt-1"
          style={{ color: "rgba(201,162,39,0.5)" }}
        >
          Tenant Details
        </div>

        {/* Tenant */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Tenant Name">
            <FieldInput
              name="tenant-name"
              placeholder="John Doe"
              value={form.tenantName}
              onChange={set("tenantName")}
            />
          </FormField>
          <FormField label="Tenant Phone">
            <FieldInput
              name="tenant-phone"
              type="tel"
              placeholder="+91 98765 43210"
              value={form.tenantPhone}
              onChange={set("tenantPhone")}
            />
          </FormField>
        </div>

        <FormField label="Tenant Email" error={fieldErrors.tenantEmail}>
          <FieldInput
            name="tenant-email"
            type="email"
            placeholder="tenant@example.com"
            value={form.tenantEmail}
            onChange={set("tenantEmail")}
          />
        </FormField>

        {/* Tags */}
        <FormField label="Tags">
          <TagSelect
            value={form.tags}
            onChange={(tags) => setForm((f) => ({ ...f, tags }))}
          />
        </FormField>

        {error && <FormError>{error}</FormError>}
      </div>

      <ModalFooter
        onCancel={onClose}
        onSave={handleSave}
        saveLabel={isEdit ? "Update" : "Add Property"}
        saving={saving}
      />
    </Modal>
  );
}
