"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Asset, AssetType } from "@/lib/api";
import { useOverlayLifecycle } from "@/lib/ui/modalLifecycle";
import { LiveAssetPicker, type LiveAssetSelection } from "@/components/assets/LiveAssetPicker";

interface ClientInventoryModalProps {
  mode: "create" | "edit";
  initialAsset?: Asset | null;
  pending?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}

type FormType = AssetType;

type FormState = Record<string, string | boolean>;

function toNumericOrUndefined(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toStringValue(value: unknown): string {
  if (value == null) return "";
  return String(value);
}

export function ClientInventoryModal({
  mode,
  initialAsset = null,
  pending = false,
  error = null,
  onClose,
  onSubmit,
}: ClientInventoryModalProps) {
  const [type, setType] = useState<FormType>(initialAsset?.type ?? "stock");
  const [form, setForm] = useState<FormState>({});
  const { requestClose, isTopMost, stackIndex } = useOverlayLifecycle({
    open: true,
    onClose,
    type: "modal",
    lockBodyScroll: true,
  });
  const requestModalClose = useCallback(
    (reason: "cancel" | "backdrop") => {
      if (pending) return;
      requestClose(reason);
    },
    [pending, requestClose]
  );

  useEffect(() => {
    const asset = initialAsset;
    setType(asset?.type ?? "stock");
    setForm({
      type: asset?.type ?? "stock",
      name: toStringValue(asset?.name),
      symbol: toStringValue(asset?.symbol),
      quantity: toStringValue(asset?.quantity),
      avg_price: toStringValue(asset?.avg_price ?? asset?.avgPrice),
      current_price: toStringValue(asset?.current_price ?? asset?.currentPrice),
      units: toStringValue(asset?.quantity),
      nav: toStringValue(asset?.avg_price ?? asset?.avgPrice ?? asset?.current_price ?? asset?.currentPrice),
      location: toStringValue(asset?.location),
      purchase_price: toStringValue(asset?.purchase_price ?? asset?.purchasePrice),
      current_value: toStringValue(asset?.current_value ?? asset?.currentValue),
      rent_amount: toStringValue(asset?.rent_amount ?? asset?.rentAmount),
      rent_due_date: toStringValue(asset?.rent_due_date ?? asset?.rentDueDate),
      tenant_name: toStringValue(asset?.tenant_name ?? asset?.tenantName),
      tenant_phone: toStringValue(asset?.tenant_phone ?? asset?.tenantPhone),
      tenant_email: toStringValue(asset?.tenant_email ?? asset?.tenantEmail),
      rent_received: Boolean((asset as Record<string, unknown> | null)?.rent_received),
      last_paid_date: toStringValue((asset as Record<string, unknown> | null)?.last_paid_date),
    });
  }, [initialAsset, mode]);

  const title = useMemo(() => (mode === "create" ? "Add Inventory" : "Edit Inventory"), [mode]);

  function setValue(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function applyLiveSelection(selection: LiveAssetSelection) {
    setForm((prev) => {
      const next: FormState = {
        ...prev,
        symbol: selection.symbol,
        name: selection.name,
      };
      if (selection.kind === "mutual-fund") {
        next.nav = selection.price ? String(selection.price) : toStringValue(prev.nav);
        next.avg_price = next.nav;
        next.current_price = next.nav;
      } else {
        next.avg_price = selection.price ? String(selection.price) : toStringValue(prev.avg_price);
        next.current_price = next.avg_price;
      }
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const payload: Record<string, unknown> = {
      type,
      name: toStringValue(form.name).trim(),
      symbol: toStringValue(form.symbol).trim() || undefined,
      tags: Array.isArray(initialAsset?.tags) ? initialAsset?.tags : [],
    };

    if (type === "stock" || type === "commodity") {
      payload.quantity = toNumericOrUndefined(toStringValue(form.quantity));
      payload.avg_price = toNumericOrUndefined(toStringValue(form.avg_price));
      payload.current_price = toNumericOrUndefined(toStringValue(form.current_price));
    }

    if (type === "mf") {
      const units = toNumericOrUndefined(toStringValue(form.units));
      const nav = toNumericOrUndefined(toStringValue(form.nav));
      payload.units = units;
      payload.quantity = units;
      payload.nav = nav;
      payload.avg_price = nav;
      payload.current_price = nav;
    }

    if (type === "property") {
      payload.location = toStringValue(form.location).trim() || undefined;
      payload.purchase_price = toNumericOrUndefined(toStringValue(form.purchase_price));
      payload.current_value = toNumericOrUndefined(toStringValue(form.current_value));
      payload.rent_amount = toNumericOrUndefined(toStringValue(form.rent_amount));
      payload.rent_due_date = toStringValue(form.rent_due_date).trim() || undefined;
      payload.tenant_name = toStringValue(form.tenant_name).trim() || undefined;
      payload.tenant_phone = toStringValue(form.tenant_phone).trim() || undefined;
      payload.tenant_email = toStringValue(form.tenant_email).trim() || undefined;
      payload.rent_received = Boolean(form.rent_received);
      payload.last_paid_date = toStringValue(form.last_paid_date).trim() || undefined;
    }

    await onSubmit(payload);
  }

  const inputClass = "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-sky-300/40 focus:bg-sky-500/[0.08]";
  const labelClass = "mb-1 block text-[11px] uppercase tracking-[0.14em] text-slate-400";

  return (
    <div
      className="fixed inset-0 flex items-end justify-center p-3 sm:items-center"
      style={{
        zIndex: 1200 + Math.max(stackIndex, 0) * 10,
        background: isTopMost ? "rgba(0,0,0,0.7)" : "transparent",
        pointerEvents: isTopMost ? "auto" : "none",
      }}
      onClick={() => requestModalClose("backdrop")}
      aria-hidden={!isTopMost}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-[1.5rem] border border-white/10 bg-[linear-gradient(160deg,rgba(10,22,51,0.98),rgba(4,9,21,0.99))] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <button
            type="button"
            disabled={pending}
            onClick={() => requestModalClose("cancel")}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[78vh] space-y-4 overflow-y-auto px-4 py-4">
          <div>
            <p className={labelClass}>Asset Type</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["stock", "mf", "commodity", "property"] as const).map((choice) => (
                <button
                  key={choice}
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    setType(choice);
                    setValue("type", choice);
                  }}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                    type === choice
                      ? "border-sky-300/40 bg-sky-500/20 text-sky-100"
                      : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {choice === "mf" ? "Mutual fund" : choice}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>Name</label>
            <input required className={inputClass} value={toStringValue(form.name)} onChange={(event) => setValue("name", event.target.value)} />
          </div>

          {(type === "stock" || type === "mf" || type === "commodity") ? (
            <div>
              <label className={labelClass}>Search assets</label>
              <LiveAssetPicker
                value={toStringValue(form.symbol || form.name)}
                allowedKinds={
                  type === "stock"
                    ? ["stock", "global-stock", "etf"]
                    : type === "mf"
                    ? ["mutual-fund"]
                    : ["commodity", "metal"]
                }
                placeholder="Search live assets"
                onSelect={applyLiveSelection}
              />
            </div>
          ) : null}

          {(type === "stock" || type === "commodity") ? (
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Symbol</label>
                <input className={inputClass} value={toStringValue(form.symbol)} onChange={(event) => setValue("symbol", event.target.value)} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className={labelClass}>Quantity</label>
                  <input type="number" className={inputClass} value={toStringValue(form.quantity)} onChange={(event) => setValue("quantity", event.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Avg price</label>
                  <input type="number" className={inputClass} value={toStringValue(form.avg_price)} onChange={(event) => setValue("avg_price", event.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Current price</label>
                  <input type="number" className={inputClass} value={toStringValue(form.current_price)} onChange={(event) => setValue("current_price", event.target.value)} />
                </div>
              </div>
            </div>
          ) : null}

          {type === "mf" ? (
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Fund symbol/code</label>
                <input className={inputClass} value={toStringValue(form.symbol)} onChange={(event) => setValue("symbol", event.target.value)} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Units</label>
                  <input type="number" className={inputClass} value={toStringValue(form.units)} onChange={(event) => setValue("units", event.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>NAV</label>
                  <input type="number" className={inputClass} value={toStringValue(form.nav)} onChange={(event) => setValue("nav", event.target.value)} />
                </div>
              </div>
            </div>
          ) : null}

          {type === "property" ? (
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Location</label>
                <input className={inputClass} value={toStringValue(form.location)} onChange={(event) => setValue("location", event.target.value)} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Purchase price</label>
                  <input type="number" className={inputClass} value={toStringValue(form.purchase_price)} onChange={(event) => setValue("purchase_price", event.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Current value</label>
                  <input type="number" className={inputClass} value={toStringValue(form.current_value)} onChange={(event) => setValue("current_value", event.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Monthly rent</label>
                  <input type="number" className={inputClass} value={toStringValue(form.rent_amount)} onChange={(event) => setValue("rent_amount", event.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Rent due date</label>
                  <input type="date" className={inputClass} value={toStringValue(form.rent_due_date)} onChange={(event) => setValue("rent_due_date", event.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Tenant name</label>
                  <input className={inputClass} value={toStringValue(form.tenant_name)} onChange={(event) => setValue("tenant_name", event.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Tenant phone</label>
                  <input className={inputClass} value={toStringValue(form.tenant_phone)} onChange={(event) => setValue("tenant_phone", event.target.value)} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Tenant email</label>
                <input type="email" className={inputClass} value={toStringValue(form.tenant_email)} onChange={(event) => setValue("tenant_email", event.target.value)} />
              </div>
            </div>
          ) : null}

          {error ? <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{error}</div> : null}

          <div className="flex flex-col-reverse gap-2 border-t border-white/10 pt-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => requestModalClose("cancel")}
              disabled={pending}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-xl bg-sky-400 px-4 py-2 text-sm font-semibold text-[#04102a] transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pending ? "Saving…" : mode === "create" ? "Add inventory" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
