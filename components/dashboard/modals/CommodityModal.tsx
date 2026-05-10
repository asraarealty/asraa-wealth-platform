"use client";

import { useEffect, useState } from "react";
import Modal, { FieldInput, FormError, FormField, ModalFooter } from "./Modal";
import TagSelect from "../TagSelect";
import CommoditySearch from "../CommoditySearch";
import type {
  Asset,
  CommodityResult,
  CreateAssetPayload,
  UpdateAssetPayload,
} from "@/lib/api";

interface CommodityModalProps {
  asset?: Asset | null;
  onClose: () => void;
  onSave: (payload: CreateAssetPayload | UpdateAssetPayload) => Promise<void>;
}

interface CommodityForm {
  symbol: string;
  name: string;
  exchange: string;
  quantity: string;
  avgPrice: string;
  tags: string[];
}

interface CommodityFieldErrors {
  symbol?: string;
  name?: string;
  quantity?: string;
  avgPrice?: string;
}

const EMPTY: CommodityForm = {
  symbol: "",
  name: "",
  exchange: "",
  quantity: "",
  avgPrice: "",
  tags: ["commodity"],
};

function toCommodityTags(tags: string[]): string[] {
  const merged = ["commodity", ...tags];
  return Array.from(new Set(merged.filter(Boolean)));
}

export default function CommodityModal({ asset, onClose, onSave }: CommodityModalProps) {
  const isEdit = Boolean(asset);
  const [form, setForm] = useState<CommodityForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<CommodityFieldErrors>({});

  useEffect(() => {
    if (asset) {
      setForm({
        symbol: asset.symbol ?? "",
        name: asset.name ?? "",
        exchange: asset.exchange ?? "",
        quantity: asset.quantity != null ? String(asset.quantity) : "",
        avgPrice: asset.avgPrice != null ? String(asset.avgPrice) : "",
        tags: toCommodityTags(asset.tags ?? []),
      });
    } else {
      setForm(EMPTY);
    }
    setError(null);
    setFieldErrors({});
  }, [asset]);

  function handleCommoditySelect(item: CommodityResult) {
    setForm((prev) => ({
      ...prev,
      symbol: item.symbol.toUpperCase(),
      name: item.name,
      exchange: item.source,
      avgPrice:
        typeof item.currentPrice === "number" && item.currentPrice > 0
          ? String(item.currentPrice)
          : prev.avgPrice,
      tags: toCommodityTags([...(prev.tags ?? []), item.assetType]),
    }));
  }

  async function handleSave() {
    if (saving) return;

    const symbol = form.symbol.trim();
    const name = form.name.trim();
    const quantity = Number(form.quantity.trim());
    const avgPrice = Number(form.avgPrice.trim());
    const exchange = form.exchange.trim();
    const nextFieldErrors: CommodityFieldErrors = {};

    if (!symbol) nextFieldErrors.symbol = "Commodity symbol is required";
    if (!name) nextFieldErrors.name = "Commodity name is required";
    if (!Number.isFinite(quantity) || quantity <= 0) {
      nextFieldErrors.quantity = "Quantity must be a positive number";
    }
    if (!Number.isFinite(avgPrice) || avgPrice <= 0) {
      nextFieldErrors.avgPrice = "Average price must be a positive number";
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
        name,
        exchange: exchange || undefined,
        quantity,
        avgPrice,
        tags: toCommodityTags(form.tags),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit Commodity" : "Add Commodity"} onClose={onClose}>
      <div className="space-y-4">
        <FormField label="Search Commodity">
          <CommoditySearch onSelect={handleCommoditySelect} />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Symbol" required error={fieldErrors.symbol}>
            <FieldInput
              name="commodity-symbol"
              placeholder="GOLD or GOLDBEES.NS"
              value={form.symbol}
              onChange={(v) => {
                setForm((f) => ({ ...f, symbol: v.toUpperCase() }));
                setFieldErrors((prev) => ({ ...prev, symbol: undefined }));
              }}
            />
          </FormField>
          <FormField label="Asset Name" required error={fieldErrors.name}>
            <FieldInput
              name="commodity-name"
              placeholder="Gold Spot"
              value={form.name}
              onChange={(v) => {
                setForm((f) => ({ ...f, name: v }));
                setFieldErrors((prev) => ({ ...prev, name: undefined }));
              }}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <FormField label="Source">
            <FieldInput
              name="commodity-source"
              placeholder="MCX / NSE / Derived"
              value={form.exchange}
              onChange={(v) => setForm((f) => ({ ...f, exchange: v }))}
            />
          </FormField>
          <FormField label="Quantity" required error={fieldErrors.quantity}>
            <FieldInput
              name="commodity-quantity"
              type="number"
              min="0"
              step="0.001"
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
              name="commodity-avg-price"
              type="number"
              min="0"
              step="0.01"
              placeholder="7000"
              value={form.avgPrice}
              onChange={(v) => {
                setForm((f) => ({ ...f, avgPrice: v }));
                setFieldErrors((prev) => ({ ...prev, avgPrice: undefined }));
              }}
            />
          </FormField>
        </div>

        <FormField label="Tags">
          <TagSelect
            value={toCommodityTags(form.tags)}
            onChange={(tags) => setForm((f) => ({ ...f, tags: toCommodityTags(tags) }))}
          />
        </FormField>

        {error && <FormError>{error}</FormError>}
      </div>

      <ModalFooter
        onCancel={onClose}
        onSave={handleSave}
        saveLabel={isEdit ? "Update" : "Add Commodity"}
        saving={saving}
      />
    </Modal>
  );
}
