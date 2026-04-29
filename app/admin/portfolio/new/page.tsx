"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPortfolioItem } from "@/lib/api";
import { toErrorMessage } from "@/lib/fetcher";

export default function NewPortfolioPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    symbol: "",
    name: "",
    quantity: "",
    avg_price: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = () => {
    if (!form.symbol.trim()) return "Symbol is required";
    if (!form.name.trim()) return "Name is required";
    if (!form.quantity || isNaN(Number(form.quantity)) || Number(form.quantity) <= 0)
      return "Valid quantity is required";
    if (!form.avg_price || isNaN(Number(form.avg_price)) || Number(form.avg_price) <= 0)
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
      await createPortfolioItem({
        symbol: form.symbol.trim().toUpperCase(),
        name: form.name.trim(),
        quantity: Number(form.quantity),
        avg_price: Number(form.avg_price),
      });

      router.push("/admin/portfolio");
    } catch (err: any) {
      console.error(err);
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
          Add a new portfolio position
        </p>
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
        {/* SYMBOL */}
        <div>
          <label className="text-sm text-gray-400">Symbol</label>
          <input
            type="text"
            placeholder="e.g. AAPL, 120503, PROP-001"
            value={form.symbol}
            onChange={(e) => handleChange("symbol", e.target.value)}
            className="w-full mt-1 p-2 rounded-xl bg-transparent border border-gray-600 focus:outline-none focus:ring-1"
            required
          />
        </div>

        {/* NAME */}
        <div>
          <label className="text-sm text-gray-400">Name</label>
          <input
            type="text"
            placeholder="e.g. Apple Inc."
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="w-full mt-1 p-2 rounded-xl bg-transparent border border-gray-600 focus:outline-none focus:ring-1"
            required
          />
        </div>

        {/* QUANTITY */}
        <div>
          <label className="text-sm text-gray-400">Quantity</label>
          <input
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
          <label className="text-sm text-gray-400">Average Price</label>
          <input
            type="number"
            min="0"
            step="any"
            placeholder="0.00"
            value={form.avg_price}
            onChange={(e) => handleChange("avg_price", e.target.value)}
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
