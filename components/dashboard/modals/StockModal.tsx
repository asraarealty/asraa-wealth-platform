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
  exchange: string;
  quantity: string;
  avgPrice: string;
  currentPrice: string;
  tags: string[];
}

interface StockFieldErrors {
  symbol?: string;
  name?: string;
  exchange?: string;
  quantity?: string;
  avgPrice?: string;
  currentPrice?: string;
}

const EMPTY: StockForm = {
  symbol: "",
  name: "",
  exchange: "",
  quantity: "",
  avgPrice: "",
  currentPrice: "",
  tags: [],
};

function toFiniteNumber(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function mapServerErrorToFieldErrors(message: string): StockFieldErrors {
  const msg = message.toLowerCase();
  const next: StockFieldErrors = {};
  if (msg.includes("symbol")) next.symbol = "Symbol is required";
  if (msg.includes("name")) next.name = "Name is required";
  if (msg.includes("exchange")) next.exchange = "Exchange is invalid";
  if (msg.includes("quantity")) next.quantity = "Quantity is invalid";
  if (msg.includes("avg") || msg.includes("average")) next.avgPrice = "Average price is invalid";
  if (msg.includes("current")) next.currentPrice = "Current price is invalid";
  return next;
}

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
        exchange: asset.exchange ?? "",
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
    const rawStock = stock as StockQuote & {
      company_name?: string;
      companyName?: string;
      current_price?: unknown;
    };
    const stockSymbol = rawStock.symbol || "";
    const stockPrice = toFiniteNumber(
      rawStock.currentPrice ||
        rawStock.current_price ||
        rawStock.price ||
        0
    );
    const inferredExchange =
      rawStock.exchange ??
      validateStockSymbol(stockSymbol).exchange ??
      "NSE";

    setForm((f) => ({
      ...f,
      symbol: stockSymbol,
      name: rawStock.name || rawStock.company_name || rawStock.companyName || "",
      exchange: String(inferredExchange || "NSE").toUpperCase(),
      avgPrice: String(stockPrice || toFiniteNumber(f.avgPrice)),
      currentPrice: String(stockPrice || toFiniteNumber(f.currentPrice)),
    }));
  }

  async function handleSave() {
    if (saving) return;

    const symbol = form.symbol.trim().toUpperCase();
    const name = form.name.trim();
    const exchange = form.exchange.trim().toUpperCase();
    const quantity = Number(form.quantity || 0);
    const avgPrice = Number(form.avgPrice || 0);
    const currentPrice = Number(form.currentPrice || 0);
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
        exchange: exchange || symbolValidation.exchange || undefined,
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
      title={isEdit ? "Edit Stock" : "Add Stock"}
      onClose={onClose}
    >
      <div className="space-y-4">
        <FormField label="Search Stock">
          <StockSearch onSelect={handleStockSelect} />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Symbol" required error={fieldErrors.symbol}>
            <FieldInput
              name="stock-symbol"
              placeholder="AAPL or RELIANCE.NS"
              value={form.symbol}
              onChange={(v) => {
                setForm((f) => ({ ...f, symbol: String(v ?? "").toUpperCase() }));
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
          <FormField label="Exchange">
            <FieldInput
              name="stock-exchange"
              placeholder="NSE/BSE"
              value={form.exchange}
              onChange={(v) => setForm((f) => ({ ...f, exchange: String(v ?? "").toUpperCase() }))}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              placeholder="Enter average buy price"
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
              placeholder="Auto-filled from selected stock"
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
