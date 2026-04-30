"use client";

import { useState, useEffect } from "react";
import Modal, { FormField, FieldInput, ModalFooter } from "./Modal";
import TagSelect from "../TagSelect";
import MFSearch from "../MFSearch";
import type { Asset, CreateAssetPayload, UpdateAssetPayload, MutualFundResult } from "@/lib/api";

interface MFModalProps {
  asset?: Asset | null;
  onClose: () => void;
  onSave: (payload: CreateAssetPayload | UpdateAssetPayload) => Promise<void>;
}

interface MFForm {
  symbol: string;
  name: string;
  units: string;
  avg_price: string;
  tags: string[];
}

const EMPTY: MFForm = {
  symbol: "",
  name: "",
  units: "",
  avg_price: "",
  tags: [],
};

export default function MFModal({ asset, onClose, onSave }: MFModalProps) {
  const isEdit = Boolean(asset);
  const [form, setForm] = useState<MFForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (asset) {
      setForm({
        symbol: asset.symbol ?? "",
        name: asset.name ?? "",
        units: asset.quantity != null ? String(asset.quantity) : "",
        avg_price: asset.avg_price != null ? String(asset.avg_price) : "",
        tags: asset.tags ?? [],
      });
    } else {
      setForm(EMPTY);
    }
    setError(null);
  }, [asset]);

  function handleMFSelect(mf: MutualFundResult) {
    setForm((f) => ({
      ...f,
      symbol: mf.code,
      name: mf.name,
      avg_price: mf.nav ? String(mf.nav) : f.avg_price,
    }));
  }

  async function handleSave() {
    const symbol = form.symbol.trim().toUpperCase();
    const name = form.name.trim();
    const quantity = Number(form.units);
    const avg_price = Number(form.avg_price);

    if (!name) { setError("Fund name is required"); return; }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError("Units must be a positive number");
      return;
    }
    if (!Number.isFinite(avg_price) || avg_price <= 0) {
      setError("Average NAV must be a positive number");
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await onSave({
        type: "mf",
        symbol: symbol || undefined,
        name,
        quantity,
        avg_price,
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
      title={isEdit ? "Edit Mutual Fund" : "Add Mutual Fund"}
      onClose={onClose}
    >
      <div className="space-y-4">
        <FormField label="Search Mutual Fund">
          <MFSearch onSelect={handleMFSelect} initialValue={form.name} />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Fund Code">
            <FieldInput
              placeholder="HDFC001"
              value={form.symbol}
              onChange={(v) => setForm((f) => ({ ...f, symbol: v }))}
            />
          </FormField>
          <FormField label="Fund Name" required>
            <FieldInput
              placeholder="HDFC Top 100 Fund"
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Units" required>
            <FieldInput
              type="number"
              min="0"
              step="0.001"
              placeholder="100.000"
              value={form.units}
              onChange={(v) => setForm((f) => ({ ...f, units: v }))}
            />
          </FormField>
          <FormField label="Avg NAV (₹)" required>
            <FieldInput
              type="number"
              min="0"
              step="0.01"
              placeholder="250.00"
              value={form.avg_price}
              onChange={(v) => setForm((f) => ({ ...f, avg_price: v }))}
            />
          </FormField>
        </div>

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
        saveLabel={isEdit ? "Update" : "Add Fund"}
        saving={saving}
      />
    </Modal>
  );
}
