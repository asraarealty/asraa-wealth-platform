"use client";

import { useState, useEffect } from "react";
import Modal, { FormField, FieldInput, ModalFooter } from "./Modal";
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
  tags: string[];
}

const EMPTY: StockForm = {
  symbol: "",
  name: "",
  quantity: "",
  avgPrice: "",
  tags: [],
};

export default function StockModal({ asset, onClose, onSave }: StockModalProps) {
  const isEdit = Boolean(asset);
  const [form, setForm] = useState<StockForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (asset) {
      setForm({
        symbol: asset.symbol ?? "",
        name: asset.name ?? "",
        quantity: asset.quantity != null ? String(asset.quantity) : "",
        avgPrice: asset.avgPrice != null ? String(asset.avgPrice) : "",
        tags: asset.tags ?? [],
      });
    } else {
      setForm(EMPTY);
    }
    setError(null);
  }, [asset]);

  function handleStockSelect(stock: StockQuote) {
    setForm((f) => ({
      ...f,
      symbol: stock.symbol,
      name: stock.name,
      avgPrice: stock.price ? String(stock.price) : f.avgPrice,
    }));
  }

  async function handleSave() {
    const symbol = form.symbol.trim().toUpperCase();
    const name = form.name.trim();
    const quantity = Number(form.quantity);
    const avgPrice = Number(form.avgPrice);

    if (!symbol) { setError("Symbol is required"); return; }

    const symbolValidation = validateStockSymbol(symbol);
    if (!symbolValidation.valid) {
      setError(symbolValidation.error ?? "Invalid symbol format");
      return;
    }

    if (!name) { setError("Name is required"); return; }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError("Quantity must be a positive number");
      return;
    }
    if (!Number.isFinite(avgPrice) || avgPrice <= 0) {
      setError("Average price must be a positive number");
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
          <FormField label="Symbol" required>
            <FieldInput
              placeholder="AAPL or RELIANCE.NS"
              value={form.symbol}
              onChange={(v) => setForm((f) => ({ ...f, symbol: v.toUpperCase() }))}
            />
          </FormField>
          <FormField label="Name" required>
            <FieldInput
              placeholder="Apple Inc."
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Quantity" required>
            <FieldInput
              type="number"
              min="0"
              step="0.01"
              placeholder="10"
              value={form.quantity}
              onChange={(v) => setForm((f) => ({ ...f, quantity: v }))}
            />
          </FormField>
          <FormField label="Avg Price (₹)" required>
            <FieldInput
              type="number"
              min="0"
              step="0.01"
              placeholder="1500.00"
              value={form.avgPrice}
              onChange={(v) => setForm((f) => ({ ...f, avgPrice: v }))}
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
          <p className="text-sm text-red-400 rounded-lg px-3 py-2"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            {error}
          </p>
        )}
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
