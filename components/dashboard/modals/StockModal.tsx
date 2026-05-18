"use client";

import { useState, useEffect } from "react";
import Modal, { FormField, FieldInput, ModalFooter } from "./Modal";
import TagSelect from "../TagSelect";
import { LiveAssetPicker, type LiveAssetSelection } from "@/components/assets/LiveAssetPicker";
import type { Asset, CreateAssetPayload, UpdateAssetPayload } from "@/lib/api";

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
  avg_price: string;
  tags: string[];
}

const EMPTY: StockForm = {
  symbol: "",
  name: "",
  quantity: "",
  avg_price: "",
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
        avg_price: asset.avg_price != null ? String(asset.avg_price) : "",
        tags: asset.tags ?? [],
      });
    } else {
      setForm(EMPTY);
    }
    setError(null);
  }, [asset]);

  function handleStockSelect(stock: LiveAssetSelection) {
    setForm((f) => ({
      ...f,
      symbol: stock.symbol,
      name: stock.name,
      avg_price: stock.price ? String(stock.price) : f.avg_price,
    }));
  }

  async function handleSave() {
    const symbol = form.symbol.trim().toUpperCase();
    const name = form.name.trim();
    const quantity = Number(form.quantity);
    const avg_price = Number(form.avg_price);

    if (!symbol) { setError("Symbol is required"); return; }
    if (!name) { setError("Name is required"); return; }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError("Quantity must be a positive number");
      return;
    }
    if (!Number.isFinite(avg_price) || avg_price <= 0) {
      setError("Average price must be a positive number");
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await onSave({
        type: "stock",
        symbol,
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
      title={isEdit ? "Edit Stock" : "Add Stock"}
      onClose={onClose}
    >
      <div className="space-y-4">
        <FormField label="Search Stock">
          <LiveAssetPicker
            value={form.symbol}
            allowedKinds={["stock", "global-stock", "etf"]}
            placeholder="Search live stocks and ETFs"
            onSelect={handleStockSelect}
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Symbol" required>
            <FieldInput
              placeholder="AAPL"
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
