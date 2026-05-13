"use client";

import { useState, useEffect } from "react";
import Modal, { FormField, FieldInput, ModalFooter, FormError } from "./Modal";
import TagSelect from "../TagSelect";
import MFSearch from "../MFSearch";
import type { Asset, CreateAssetPayload, UpdateAssetPayload, MutualFundResult } from "@/lib/api";
import { parseDecimalInput, safeDecimalNumber } from "@/lib/utils/numberParsing";

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
  symbol?: string;
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
  return safeDecimalNumber(value, 0);
}

function mapServerErrorToFieldErrors(message: string): MFFieldErrors {
  const msg = message.toLowerCase();
  const next: MFFieldErrors = {};

  if (msg.includes("fund code") || msg.includes("fund_code") || msg.includes("symbol")) {
    next.symbol = "Fund code required";
  }
  if (msg.includes("name") || msg.includes("fund_name")) {
    next.name = "Fund name required";
  }
  if (msg.includes("quantity") || msg.includes("unit")) {
    next.units = "Quantity required";
  }
  if ((msg.includes("avg") || msg.includes("average")) && (msg.includes("nav") || msg.includes("price"))) {
    next.avgPrice = "Avg NAV invalid";
  }
  if (msg.includes("current") && (msg.includes("nav") || msg.includes("price"))) {
    next.currentPrice = "Current NAV invalid";
  }

  return next;
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
    const quantity = parseDecimalInput(form.units);
    const avgPrice = parseDecimalInput(form.avgPrice);
    const currentPrice = parseDecimalInput(form.currentPrice);
    const nextFieldErrors: MFFieldErrors = {};

    if (!symbol) nextFieldErrors.symbol = "Fund code required";
    if (!name) nextFieldErrors.name = "Fund name is required";
    if (!form.units.trim()) {
      nextFieldErrors.units = "Quantity required";
    } else if (quantity === null) {
      nextFieldErrors.units = "Quantity invalid";
    } else if (quantity <= 0) {
      nextFieldErrors.units = "Quantity must be greater than 0";
    }
    if (!form.avgPrice.trim()) {
      nextFieldErrors.avgPrice = "Avg NAV required";
    } else if (avgPrice === null) {
      nextFieldErrors.avgPrice = "Avg NAV invalid";
    } else if (avgPrice <= 0) {
      nextFieldErrors.avgPrice = "Avg NAV must be greater than 0";
    }
    if (!form.currentPrice.trim()) {
      nextFieldErrors.currentPrice = "Current NAV required";
    } else if (currentPrice === null) {
      nextFieldErrors.currentPrice = "Current NAV invalid";
    } else if (currentPrice <= 0) {
      nextFieldErrors.currentPrice = "Current NAV must be greater than 0";
    }

    if (process.env.NODE_ENV === "development") {
      console.debug("[MFModal] pre_submit", {
        rawFormState: form,
        normalizedPayload: {
          assetType: "mutual_fund",
          fundCode: symbol || null,
          fundName: name || null,
          quantity,
          avgNav: avgPrice,
          currentNav: currentPrice,
        },
        validationResult: {
          valid: Object.keys(nextFieldErrors).length === 0,
          rejectedField: Object.keys(nextFieldErrors)[0] ?? null,
        },
      });
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
      title={isEdit ? "Edit Mutual Fund" : "Add Mutual Fund"}
      onClose={onClose}
    >
      <div className="space-y-4">
        <FormField label="Search Mutual Fund">
          <MFSearch onSelect={handleMFSelect} initialValue={form.name} />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Fund Code" required error={fieldErrors.symbol}>
            <FieldInput
              name="mf-symbol"
              placeholder="HDFC001"
              value={form.symbol}
              onChange={(v) => {
                setForm((f) => ({ ...f, symbol: v }));
                setFieldErrors((prev) => ({ ...prev, symbol: undefined }));
              }}
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
