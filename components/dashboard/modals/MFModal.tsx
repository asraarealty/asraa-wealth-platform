"use client";

import { useState, useEffect } from "react";
import Modal, { FormField, FieldInput, ModalFooter, FormError } from "./Modal";
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
  avgPrice: string;
  currentPrice: string;
  tags: string[];
}

interface MFFieldErrors {
  name?: string;
  units?: string;
  avgPrice?: string;
  currentPrice?: string;
}

const EMPTY: MFForm = {
  symbol: "",
  name: "",
  units: "",
  avgPrice: "",
  currentPrice: "",
  tags: [],
};

function toFiniteNumber(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export default function MFModal({ asset, onClose, onSave }: MFModalProps) {
  const isEdit = Boolean(asset);
  const [form, setForm] = useState<MFForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<MFFieldErrors>({});

  useEffect(() => {
    if (asset) {
      setForm({
        symbol: asset.symbol ?? "",
        name: asset.name ?? "",
        units: asset.quantity != null ? String(asset.quantity) : "",
        avgPrice: asset.avgPrice != null ? String(asset.avgPrice) : "",
        currentPrice: asset.currentPrice != null ? String(asset.currentPrice) : "",
        tags: asset.tags ?? [],
      });
    } else {
      setForm(EMPTY);
    }
    setError(null);
    setFieldErrors({});
  }, [asset]);

  function handleMFSelect(mf: MutualFundResult) {
    const rawFund = mf as MutualFundResult & {
      current_nav?: unknown;
      latestNav?: unknown;
    };
    const nav = toFiniteNumber(
      rawFund.current_nav ||
        rawFund.nav ||
        rawFund.latestNav ||
        0
    );
    setForm((f) => ({
      ...f,
      symbol: mf.code,
      name: mf.name,
      avgPrice: String(nav || toFiniteNumber(f.avgPrice)),
      currentPrice: String(nav || toFiniteNumber(f.currentPrice)),
    }));
  }

  async function handleSave() {
    if (saving) return;

    const symbol = form.symbol.trim().toUpperCase();
    const name = form.name.trim();
    const quantity = Number(form.units || 0);
    const avgPrice = Number(form.avgPrice || 0);
    const currentPrice = Number(form.currentPrice || 0);
    const nextFieldErrors: MFFieldErrors = {};

    if (!name) nextFieldErrors.name = "Fund name is required";
    if (!Number.isFinite(quantity) || quantity <= 0) {
      nextFieldErrors.units = "Units must be a positive number";
    }
    if (!Number.isFinite(avgPrice) || avgPrice <= 0) {
      nextFieldErrors.avgPrice = "Average NAV must be a positive number";
    }
    if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
      nextFieldErrors.currentPrice = "Current NAV must be a positive number";
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
        type: "mf",
        symbol: symbol || undefined,
        name,
        quantity: toFiniteNumber(quantity),
        avgPrice: toFiniteNumber(avgPrice),
        currentPrice: toFiniteNumber(currentPrice),
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Fund Code">
            <FieldInput
              name="mf-symbol"
              placeholder="HDFC001"
              value={form.symbol}
              onChange={(v) => setForm((f) => ({ ...f, symbol: v }))}
            />
          </FormField>
          <FormField label="Fund Name" required error={fieldErrors.name}>
            <FieldInput
              name="mf-name"
              placeholder="HDFC Top 100 Fund"
              value={form.name}
              onChange={(v) => {
                setForm((f) => ({ ...f, name: v }));
                setFieldErrors((prev) => ({ ...prev, name: undefined }));
              }}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Units" required error={fieldErrors.units}>
            <FieldInput
              name="mf-units"
              type="number"
              min="0"
              step="0.001"
              placeholder="100.000"
              value={form.units}
              onChange={(v) => {
                setForm((f) => ({ ...f, units: v }));
                setFieldErrors((prev) => ({ ...prev, units: undefined }));
              }}
            />
          </FormField>
          <FormField label="Avg NAV (₹)" required error={fieldErrors.avgPrice}>
            <FieldInput
              name="mf-avg-nav"
              type="number"
              min="0"
              step="0.01"
              placeholder="Enter average NAV"
              value={form.avgPrice}
              onChange={(v) => {
                setForm((f) => ({ ...f, avgPrice: v }));
                setFieldErrors((prev) => ({ ...prev, avgPrice: undefined }));
              }}
            />
          </FormField>
          <FormField label="Current NAV (₹)" required error={fieldErrors.currentPrice}>
            <FieldInput
              name="mf-current-nav"
              type="number"
              min="0"
              step="0.01"
              placeholder="Auto-filled from selected fund"
              value={form.currentPrice}
              onChange={(v) => {
                setForm((f) => ({ ...f, currentPrice: v }));
                setFieldErrors((prev) => ({ ...prev, currentPrice: undefined }));
              }}
            />
          </FormField>
        </div>

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
        saveLabel={isEdit ? "Update" : "Add Fund"}
        saving={saving}
      />
    </Modal>
  );
}
