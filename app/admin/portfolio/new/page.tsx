"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAsset } from "@/lib/api";
import { toErrorMessage } from "@/lib/fetcher";
import ClientSelector from "@/components/ClientSelector";
import type { Client, AssetType } from "@/lib/api";

const ASSET_TYPES: { value: AssetType; label: string }[] = [
  { value: "stock", label: "Stock" },
  { value: "mf", label: "Mutual Fund" },
  { value: "property", label: "Real Estate" },
];

export default function NewPortfolioPage() {
  const router = useRouter();

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [form, setForm] = useState({
    type: "stock" as AssetType,
    symbol: "",
    name: "",
    quantity: "",
    avgPrice: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = () => {
    if (!selectedClient) return "Please select a client";
    if (form.type !== "property" && !form.symbol.trim())
      return "Symbol is required for stocks and mutual funds";
    if (!form.name.trim()) return "Name is required";
    if (!form.quantity || isNaN(Number(form.quantity)) || Number(form.quantity) <= 0)
      return "Valid quantity is required";
    if (!form.avgPrice || isNaN(Number(form.avgPrice)) || Number(form.avgPrice) <= 0)
      return "Valid average price is required";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      await createAsset({
        type: form.type,
        // Symbol is required for stocks and MFs; optional for real estate.
        symbol:
          form.type !== "property"
            ? form.symbol.trim().toUpperCase()
            : form.symbol.trim().toUpperCase() || undefined,
        name: form.name.trim(),
        quantity: Number(form.quantity),
        avgPrice: Number(form.avgPrice),
        currentPrice: Number(form.avgPrice || 0),
        clientId: selectedClient!.id,
      });

      router.push("/admin/portfolio");
    } catch (err: unknown) {
      setError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto text-white space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#c9a227" }}>
          Add Position
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Add a new asset to a client&apos;s portfolio
        </p>
      </div>

      {/* CLIENT SELECTOR */}
      <div
        className="p-5 rounded-2xl"
        style={{
          background: "rgba(11,61,46,0.6)",
          border: "1px solid rgba(201,162,39,0.2)",
        }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: "#c9a227" }}
        >
          Select Client *
        </p>
        <ClientSelector
          selectedId={selectedClient?.id ?? null}
          onChange={setSelectedClient}
        />
      </div>

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className="space-y-4 p-6 rounded-2xl"
        style={{
          background: "rgba(11,61,46,0.6)",
          border: "1px solid rgba(201,162,39,0.2)",
        }}
      >
        {/* ASSET TYPE */}
        <div>
          <label htmlFor="asset-type" className="text-sm text-gray-400">Asset Type *</label>
          <select
            id="asset-type"
            value={form.type}
            onChange={(e) => handleChange("type", e.target.value)}
            className="w-full mt-1 p-2 rounded-xl bg-transparent border border-gray-600 focus:outline-none focus:ring-1 text-white"
            style={{ background: "rgba(11,61,46,0.8)" }}
            required
          >
            {ASSET_TYPES.map((t) => (
              <option key={t.value} value={t.value} style={{ background: "#0b3d2e" }}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* SYMBOL */}
        <div>
          <label htmlFor="asset-symbol" className="text-sm text-gray-400">
            Symbol{form.type === "property" ? " (optional)" : ""}
          </label>
          <input
            id="asset-symbol"
            type="text"
            placeholder={
              form.type === "stock"
                ? "e.g. AAPL, RELIANCE"
                : form.type === "mf"
                ? "e.g. 120503"
                : "e.g. PROP-001"
            }
            value={form.symbol}
            onChange={(e) => handleChange("symbol", e.target.value)}
            className="w-full mt-1 p-2 rounded-xl bg-transparent border border-gray-600 focus:outline-none focus:ring-1"
          />
        </div>

        {/* NAME */}
        <div>
          <label htmlFor="asset-name" className="text-sm text-gray-400">Name *</label>
          <input
            id="asset-name"
            type="text"
            placeholder={
              form.type === "stock"
                ? "e.g. Apple Inc."
                : form.type === "mf"
                ? "e.g. HDFC Top 100 Fund"
                : "e.g. Sunrise Villa"
            }
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="w-full mt-1 p-2 rounded-xl bg-transparent border border-gray-600 focus:outline-none focus:ring-1"
            required
          />
        </div>

        {/* QUANTITY */}
        <div>
          <label htmlFor="asset-quantity" className="text-sm text-gray-400">
            {form.type === "mf" ? "Units *" : form.type === "property" ? "Quantity (1 for single property) *" : "Quantity *"}
          </label>
          <input
            id="asset-quantity"
            type="number"
            min="0"
            step="any"
            placeholder="0"
            value={form.quantity}
            onChange={(e) => handleChange("quantity", e.target.value)}
            className="w-full mt-1 p-2 rounded-xl bg-transparent border border-gray-600 focus:outline-none focus:ring-1"
            required
          />
        </div>

        {/* AVG PRICE */}
        <div>
          <label htmlFor="asset-avg-price" className="text-sm text-gray-400">
            {form.type === "mf" ? "Avg NAV (₹) *" : form.type === "property" ? "Purchase Price (₹) *" : "Average Price (₹) *"}
          </label>
          <input
            id="asset-avg-price"
            type="number"
            min="0"
            step="any"
            placeholder="0.00"
            value={form.avgPrice}
            onChange={(e) => handleChange("avgPrice", e.target.value)}
            className="w-full mt-1 p-2 rounded-xl bg-transparent border border-gray-600 focus:outline-none focus:ring-1"
            required
          />
        </div>

        {/* ERROR */}
        {error && <div className="text-red-400 text-sm">{error}</div>}

        {/* ACTIONS */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-xl font-semibold text-black"
            style={{
              background: "linear-gradient(90deg, #C9A227, #d4af4a)",
            }}
          >
            {loading ? "Adding..." : "Add Position"}
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 rounded-xl border border-gray-500 text-gray-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
