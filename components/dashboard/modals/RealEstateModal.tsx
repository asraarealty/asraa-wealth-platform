"use client";

import { useState, useEffect } from "react";
import Modal, { FormField, FieldInput, ModalFooter } from "./Modal";
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
  purchase_price: string;
  current_value: string;
  rent_amount: string;
  rent_due_date: string;
  tenant_name: string;
  tenant_phone: string;
  tenant_email: string;
  tags: string[];
}

const EMPTY: REForm = {
  name: "",
  location: "",
  purchase_price: "",
  current_value: "",
  rent_amount: "",
  rent_due_date: "",
  tenant_name: "",
  tenant_phone: "",
  tenant_email: "",
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
        purchase_price:
          asset.purchasePrice != null ? String(asset.purchasePrice) : "",
        current_value:
          asset.currentValue != null ? String(asset.currentValue) : "",
        rent_amount:
          asset.rentAmount != null ? String(asset.rentAmount) : "",
        rent_due_date: asset.rentDueDate ?? "",
        tenant_name: asset.tenantName ?? "",
        tenant_phone: asset.tenantPhone ?? "",
        tenant_email: asset.tenantEmail ?? "",
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
    const name = form.name.trim();
    const purchase_price = Number(form.purchase_price);
    const current_value = Number(form.current_value);
    const rent_amount = form.rent_amount ? Number(form.rent_amount) : undefined;

    if (!name) { setError("Property name is required"); return; }
    if (!Number.isFinite(purchase_price) || purchase_price <= 0) {
      setError("Purchase price must be a positive number");
      return;
    }
    if (!Number.isFinite(current_value) || current_value <= 0) {
      setError("Current value must be a positive number");
      return;
    }
    if (
      rent_amount !== undefined &&
      (!Number.isFinite(rent_amount) || rent_amount < 0)
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
        purchasePrice: purchase_price,
        currentValue: current_value,
        avgPrice: purchase_price,
        quantity: 1,
        rentAmount: rent_amount,
        rentDueDate: form.rent_due_date || undefined,
        tenantName: form.tenant_name.trim() || undefined,
        tenantPhone: form.tenant_phone.trim() || undefined,
        tenantEmail: form.tenant_email.trim() || undefined,
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
      width="w-full max-w-lg"
    >
      <div className="space-y-4">
        {/* Property Info */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Property Name" required>
            <FieldInput
              placeholder="Sunrise Villa"
              value={form.name}
              onChange={set("name")}
            />
          </FormField>
          <FormField label="Location">
            <FieldInput
              placeholder="Mumbai, Maharashtra"
              value={form.location}
              onChange={set("location")}
            />
          </FormField>
        </div>

        {/* Financials */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Purchase Price (₹)" required>
            <FieldInput
              type="number"
              min="0"
              step="1000"
              placeholder="5000000"
              value={form.purchase_price}
              onChange={set("purchase_price")}
            />
          </FormField>
          <FormField label="Current Value (₹)" required>
            <FieldInput
              type="number"
              min="0"
              step="1000"
              placeholder="6500000"
              value={form.current_value}
              onChange={set("current_value")}
            />
          </FormField>
        </div>

        {/* Rent */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Monthly Rent (₹)">
            <FieldInput
              type="number"
              min="0"
              step="100"
              placeholder="25000"
              value={form.rent_amount}
              onChange={set("rent_amount")}
            />
          </FormField>
          <FormField label="Rent Due Date">
            <FieldInput
              type="date"
              value={form.rent_due_date}
              onChange={set("rent_due_date")}
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
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Tenant Name">
            <FieldInput
              placeholder="John Doe"
              value={form.tenant_name}
              onChange={set("tenant_name")}
            />
          </FormField>
          <FormField label="Tenant Phone">
            <FieldInput
              type="tel"
              placeholder="+91 98765 43210"
              value={form.tenant_phone}
              onChange={set("tenant_phone")}
            />
          </FormField>
        </div>

        <FormField label="Tenant Email">
          <FieldInput
            type="email"
            placeholder="tenant@example.com"
            value={form.tenant_email}
            onChange={set("tenant_email")}
          />
        </FormField>

        {/* Tags */}
        <FormField label="Tags">
          <TagSelect
            value={form.tags}
            onChange={(tags) => setForm((f) => ({ ...f, tags }))}
          />
        </FormField>

        {error && (
          <p
            className="text-sm text-red-400 rounded-lg px-3 py-2"
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
            }}
          >
            {error}
          </p>
        )}
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
