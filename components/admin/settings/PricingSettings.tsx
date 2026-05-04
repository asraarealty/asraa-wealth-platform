"use client";

import { useEffect, useState } from "react";
import SectionCard from "./SectionCard";
import {
  getPricingPlans,
  createPricingPlan,
  updatePricingPlan,
  deletePricingPlan,
  type PricingPlan,
} from "@/lib/api";
import { toErrorMessage } from "@/lib/fetcher";

const inputCls = "w-full rounded-xl px-3 py-2 text-sm neon-input";

const PLAN_COLORS = [
  { color: "#94a3b8", bg: "rgba(148,163,184,0.06)", border: "rgba(148,163,184,0.15)" },
  { color: "#00E5FF", bg: "rgba(0,229,255,0.06)", border: "rgba(0,229,255,0.15)" },
  { color: "#C9A227", bg: "rgba(201,162,39,0.06)", border: "rgba(201,162,39,0.2)" },
  { color: "#00ff9f", bg: "rgba(0,255,159,0.06)", border: "rgba(0,255,159,0.15)" },
];

function getAccent(index: number) {
  return PLAN_COLORS[index % PLAN_COLORS.length];
}

interface EditingPlan extends Omit<PricingPlan, "id"> {
  id?: PricingPlan["id"];
}

const emptyPlan = (): EditingPlan => ({
  name: "",
  monthlyPrice: 0,
  maxClients: 10,
  maxAssets: 50,
  features: [],
});

export default function PricingSettings() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<PricingPlan["id"] | "new" | null>(null);
  const [editForm, setEditForm] = useState<EditingPlan>(emptyPlan());
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<PricingPlan["id"] | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    getPricingPlans(ac.signal)
      .then((data) => setPlans(Array.isArray(data) ? data : []))
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(toErrorMessage(err));
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  function openEdit(plan: PricingPlan) {
    setEditForm({ ...plan });
    setEditingId(plan.id);
    setActionError(null);
  }

  function openNew() {
    setEditForm(emptyPlan());
    setEditingId("new");
    setActionError(null);
  }

  function closeEdit() {
    setEditingId(null);
    setActionError(null);
  }

  function patchEditForm(partial: Partial<EditingPlan>) {
    setEditForm((prev) => ({ ...prev, ...partial }));
  }

  function patchFeature(index: number, value: string) {
    setEditForm((prev) => {
      const features = [...prev.features];
      features[index] = value;
      return { ...prev, features };
    });
  }

  function addFeature() {
    setEditForm((prev) => ({ ...prev, features: [...prev.features, ""] }));
  }

  function removeFeature(index: number) {
    setEditForm((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setActionError(null);
    try {
      const payload = {
        name: editForm.name,
        monthlyPrice: editForm.monthlyPrice,
        maxClients: editForm.maxClients,
        maxAssets: editForm.maxAssets,
        features: editForm.features.filter((f) => f.trim() !== ""),
      };
      if (editingId === "new") {
        const created = await createPricingPlan(payload);
        setPlans((prev) => [...prev, created]);
      } else if (editingId !== null) {
        const updated = await updatePricingPlan(editingId, payload);
        setPlans((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
      }
      closeEdit();
    } catch (err) {
      setActionError(toErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: PricingPlan["id"]) {
    setDeletingId(id);
    try {
      await deletePricingPlan(id);
      setPlans((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setActionError(toErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  }

  // onSave is a no-op since each plan saves individually
  async function handleSave() {}

  return (
    <SectionCard
      title="Pricing & Subscription"
      icon={
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5z" />
        </svg>
      }
      onSave={handleSave}
      loading={loading}
    >
      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: "rgba(255,77,109,0.08)", border: "1px solid rgba(255,77,109,0.2)", color: "#ff4d6d" }}
        >
          {error}
        </div>
      )}

      {actionError && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: "rgba(255,77,109,0.08)", border: "1px solid rgba(255,77,109,0.2)", color: "#ff4d6d" }}
        >
          {actionError}
        </div>
      )}

      {/* Add plan button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={openNew}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200"
          style={{
            background: "rgba(0,229,255,0.06)",
            border: "1px solid rgba(0,229,255,0.2)",
            color: "#00E5FF",
          }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Plan
        </button>
      </div>

      {/* Inline edit/create form */}
      {editingId !== null && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl p-4 space-y-3 animate-fade-in"
          style={{ background: "rgba(0,229,255,0.03)", border: "1px solid rgba(0,229,255,0.12)" }}
        >
          <p className="text-xs font-semibold" style={{ color: "#00E5FF" }}>
            {editingId === "new" ? "New Plan" : "Edit Plan"}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>Name</label>
              <input
                type="text"
                required
                className={inputCls}
                placeholder="Plan name"
                value={editForm.name}
                onChange={(e) => patchEditForm({ name: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>Monthly Price</label>
              <input
                type="number"
                required
                min={0}
                className={inputCls}
                value={editForm.monthlyPrice}
                onChange={(e) => patchEditForm({ monthlyPrice: Number(e.target.value) })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>Max Clients (-1 = ∞)</label>
              <input
                type="number"
                required
                className={inputCls}
                value={editForm.maxClients}
                onChange={(e) => patchEditForm({ maxClients: Number(e.target.value) })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>Max Assets (-1 = ∞)</label>
              <input
                type="number"
                required
                className={inputCls}
                value={editForm.maxAssets}
                onChange={(e) => patchEditForm({ maxAssets: Number(e.target.value) })}
              />
            </div>
          </div>
          {/* Features */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>Features</p>
            {editForm.features.map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  className={`${inputCls} flex-1`}
                  value={f}
                  placeholder="Feature description…"
                  onChange={(e) => patchFeature(i, e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeFeature(i)}
                  className="shrink-0"
                  style={{ color: "rgba(255,77,109,0.7)" }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addFeature}
              className="text-xs font-medium flex items-center gap-1 mt-1"
              style={{ color: "#00E5FF" }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add feature
            </button>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={closeEdit}
              className="text-xs font-medium px-3 py-1.5 rounded-lg"
              style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="neon-btn text-xs font-semibold px-4 py-1.5 rounded-lg disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save Plan"}
            </button>
          </div>
        </form>
      )}

      {/* Plan cards */}
      <div className="space-y-4">
        {plans.length === 0 && !loading && (
          <p className="text-sm text-center py-6" style={{ color: "rgba(255,255,255,0.35)" }}>
            No plans found. Add your first plan.
          </p>
        )}
        {plans.map((plan, idx) => {
          const accent = getAccent(idx);
          return (
            <div
              key={plan.id}
              className="rounded-xl p-4 space-y-3"
              style={{ background: accent.bg, border: `1px solid ${accent.border}` }}
            >
              {/* Plan header */}
              <div className="flex items-center justify-between">
                <span
                  className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                  style={{ color: accent.color, background: accent.bg, border: `1px solid ${accent.border}` }}
                >
                  {plan.name}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(plan)}
                    className="text-xs font-medium transition-colors"
                    style={{ color: "rgba(0,229,255,0.7)" }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={deletingId === plan.id}
                    onClick={() => handleDelete(plan.id)}
                    className="text-xs font-medium transition-colors disabled:opacity-50"
                    style={{ color: "rgba(255,77,109,0.7)" }}
                  >
                    {deletingId === plan.id ? "…" : "Delete"}
                  </button>
                </div>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col">
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Price / mo</span>
                  <span className="text-sm font-semibold text-white">
                    {plan.monthlyPrice === 0 ? "Free" : `₹${plan.monthlyPrice}`}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Max Clients</span>
                  <span className="text-sm font-semibold text-white">
                    {plan.maxClients === -1 ? "∞" : plan.maxClients}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Max Assets</span>
                  <span className="text-sm font-semibold text-white">
                    {plan.maxAssets === -1 ? "∞" : plan.maxAssets}
                  </span>
                </div>
              </div>

              {/* Features */}
              {plan.features.length > 0 && (
                <ul className="space-y-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
                      <svg className="w-3 h-3 shrink-0" style={{ color: accent.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
