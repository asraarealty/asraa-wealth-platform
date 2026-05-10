"use client";

import { useState, useEffect } from "react";
import Modal, { FormField, FieldInput, ModalFooter, FormError } from "./Modal";
import TagSelect from "../TagSelect";
import StockSearch from "@/components/StockSearch";
import type { Asset, CreateAssetPayload, UpdateAssetPayload } from "@/lib/api";
import type { StockQuote } from "@/lib/api";
import { validateStockSymbol } from "@/lib/services/symbolValidator";

interface StockModalProps {
  /** When provided, the modal is in edit mode */
  asset?: Asset | null;
  onClose: () => void;
  onSave: (payload: CreateAssetPayload | UpdateAssetPayload) => Promise<void>;
}

interface StockForm {
  symbol: string;
  name: string;
  quantity: string;
  avgPrice: string;
  currentPrice: string;
  tags: string[];
}

interface StockFieldErrors {
  symbol?: string;
  name?: string;
  quantity?: string;
  avgPrice?: string;
  currentPrice?: string;
}

const EMPTY: StockForm = {
  symbol: "",
  name: "",
  quantity: "",
  avgPrice: "",
  currentPrice: "",
  tags: [],
};

export default function StockModal({ asset, onClose, onSave }: StockModalProps) {
  const isEdit = Boolean(asset);
  const [form, setForm] = useState<StockForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<StockFieldErrors>({});

  useEffect(() => {
    if (asset) {
      setForm({
        symbol: asset.symbol ?? "",
        name: asset.name ?? "",
        quantity: asset.quantity != null ? String(asset.quantity) : "",
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

  function handleStockSelect(stock: StockQuote) {
    setForm((f) => ({
      ...f,
      symbol: stock.symbol,
      name: stock.name,
      avgPrice: stock.price ? String(stock.price) : f.avgPrice,
      currentPrice: stock.price ? String(stock.price) : f.currentPrice,
    }));
  }

  async function handleSave() {
    if (saving) return;

    const symbol = form.symbol.trim().toUpperCase();
    const name = form.name.trim();
    const quantity = Number(String(form.quantity).trim());
    const avgPrice = Number(String(form.avgPrice).trim());
    const currentPrice = Number(String(form.currentPrice).trim());
    const nextFieldErrors: StockFieldErrors = {};

    if (!symbol) nextFieldErrors.symbol = "Symbol is required";

    const symbolValidation = validateStockSymbol(symbol);
    if (symbol && !symbolValidation.valid) {
      nextFieldErrors.symbol = symbolValidation.error ?? "Invalid symbol format";
    }

    if (!name) nextFieldErrors.name = "Name is required";
    if (!Number.isFinite(quantity) || quantity <= 0) {
      nextFieldErrors.quantity = "Quantity must be a positive number";
    }
    if (!Number.isFinite(avgPrice) || avgPrice <= 0) {
      nextFieldErrors.avgPrice = "Average price must be a positive number";
    }
    if (!Number.isFinite(currentPrice) || currentPrice <= 0) {
      nextFieldErrors.currentPrice = "Current price must be a positive number";
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
        type: "stock",
        symbol,
        exchange: symbolValidation.exchange ?? undefined,
        name,
        quantity,
        avgPrice,
        currentPrice,
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
      title={isEdit ? "Edit Stock" : "Add Stock"}
      onClose={onClose}
    >
      <div className="space-y-4">
        <FormField label="Search Stock">
          <StockSearch onSelect={handleStockSelect} />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Symbol" required error={fieldErrors.symbol}>
            <FieldInput
              name="stock-symbol"
              placeholder="AAPL or RELIANCE.NS"
              value={form.symbol}
              onChange={(v) => {
                setForm((f) => ({ ...f, symbol: v.toUpperCase() }));
                setFieldErrors((prev) => ({ ...prev, symbol: undefined }));
              }}
            />
          </FormField>
          <FormField label="Name" required error={fieldErrors.name}>
            <FieldInput
              name="stock-name"
              placeholder="Apple Inc."
              value={form.name}
              onChange={(v) => {
                setForm((f) => ({ ...f, name: v }));
                setFieldErrors((prev) => ({ ...prev, name: undefined }));
              }}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Quantity" required error={fieldErrors.quantity}>
            <FieldInput
              name="stock-quantity"
              type="number"
              min="0"
              step="0.01"
              placeholder="10"
              value={form.quantity}
              onChange={(v) => {
                setForm((f) => ({ ...f, quantity: v }));
                setFieldErrors((prev) => ({ ...prev, quantity: undefined }));
              }}
            />
          </FormField>
          <FormField label="Avg Price (₹)" required error={fieldErrors.avgPrice}>
            <FieldInput
              name="stock-avg-price"
              type="number"
              min="0"
              step="0.01"
              placeholder="1500.00"
              value={form.avgPrice}
              onChange={(v) => {
                setForm((f) => ({ ...f, avgPrice: v }));
                setFieldErrors((prev) => ({ ...prev, avgPrice: undefined }));
              }}
            />
          </FormField>
          <FormField label="Current Price (₹)" required error={fieldErrors.currentPrice}>
            <FieldInput
              name="stock-current-price"
              type="number"
              min="0"
              step="0.01"
              placeholder="1525.00"
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
        saveLabel={isEdit ? "Update" : "Add Stock"}
        saving={saving}
      />
    </Modal>
  );
}
