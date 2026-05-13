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
  }, [asset]);

  function set(key: keyof REForm) {
    return (v: string) => setForm((f) => ({ ...f, [key]: v }));
  }

  async function handleSave() {
    if (saving) return;
    const name = form.name.trim();
    const purchasePrice = Number(form.purchasePrice);
    const currentValue = Number(form.currentValue);
    const rentAmount = form.rentAmount ? Number(form.rentAmount) : undefined;

    if (!name) { setError("Property name is required"); return; }
    if (!Number.isFinite(purchasePrice) || purchasePrice <= 0) {
      setError("Purchase price must be a positive number");
      return;
    }
    if (!Number.isFinite(currentValue) || currentValue <= 0) {
      setError("Current value must be a positive number");
      return;
    }
    if (
      rentAmount !== undefined &&
      (!Number.isFinite(rentAmount) || rentAmount < 0)
    ) {
      setError("Rent amount must be a non-negative number");
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
      setError(err instanceof Error ? err.message : "Save failed");
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
          <FormField label="Property Name" required>
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
          <FormField label="Purchase Price (₹)" required>
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
          <FormField label="Current Value (₹)" required>
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
          <FormField label="Monthly Rent (₹)">
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

        <FormField label="Tenant Email">
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
