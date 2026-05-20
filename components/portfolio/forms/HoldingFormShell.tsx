"use client";

import { useEffect, useMemo, useState } from "react";
import type { Asset, AssetType } from "@/lib/types/assets";
import { CommodityHoldingForm } from "./CommodityHoldingForm";
import { MutualFundHoldingForm } from "./MutualFundHoldingForm";
import { PropertyHoldingForm } from "./PropertyHoldingForm";
import { StockHoldingForm } from "./StockHoldingForm";
import type { HoldingDTO } from "./types";

interface HoldingFormShellProps {
  mode: "create" | "edit";
  initialAsset?: Asset | null;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  error?: string | null;
  lockedType?: AssetType;
}

function toNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function read(record: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  return undefined;
}

function toHoldingDTO(asset: Asset | null | undefined): HoldingDTO | null {
  if (!asset) return null;
  const record = asset as unknown as Record<string, unknown>;
  return {
    id: asset.id,
    assetType: asset.type,
    name: asset.name,
    symbol: asset.symbol ?? undefined,
    quantity: toNumber(read(record, "quantity")),
    units: toNumber(read(record, "units", "quantity")),
    purchasePrice: toNumber(read(record, "avg_price", "purchase_price", "purchasePrice")),
    purchaseNav: toNumber(read(record, "nav", "avg_price", "avgPrice")),
    purchaseDate: typeof read(record, "purchase_date", "purchaseDate") === "string" ? String(read(record, "purchase_date", "purchaseDate")) : undefined,
    folioNumber: typeof read(record, "folio_number", "folioNumber") === "string" ? String(read(record, "folio_number", "folioNumber")) : undefined,
    location: asset.location ?? undefined,
    currentValuation: toNumber(read(record, "current_value", "currentValue")),
    monthlyRent: toNumber(read(record, "rent_amount", "rentAmount")),
    tenantDetails: typeof read(record, "tenant_details", "tenant_name", "tenantName") === "string" ? String(read(record, "tenant_details", "tenant_name", "tenantName")) : undefined,
    valuation: {
      currentPrice: toNumber(read(record, "current_price", "currentPrice", "nav")),
      currentValue: toNumber(read(record, "current_value", "currentValue", "value")),
      unrealizedPnl: toNumber(read(record, "unrealized_pnl", "unrealizedPnl")),
      gainLoss: toNumber(read(record, "gain_loss", "gainLoss")),
      profitLoss: toNumber(read(record, "profit_loss", "profitLoss")),
      returnPercent: toNumber(read(record, "return_percentage", "returnPercent", "return_percent")),
      spotPrice: toNumber(read(record, "spot_price", "spotPrice", "current_price", "currentPrice")),
      rentalYield: toNumber(read(record, "rental_yield", "rentalYield")),
      appreciation: toNumber(read(record, "appreciation", "appreciation_value")),
      netReturn: toNumber(read(record, "net_return", "netReturn")),
    },
  };
}

export function HoldingFormShell({
  mode,
  initialAsset = null,
  onSubmit,
  onCancel,
  isSubmitting = false,
  error = null,
  lockedType,
}: HoldingFormShellProps) {
  const holding = useMemo(() => toHoldingDTO(initialAsset), [initialAsset]);
  const [assetType, setAssetType] = useState<AssetType>(lockedType ?? holding?.assetType ?? "stock");
  const [dirty, setDirty] = useState(false);
  const [renderKey, setRenderKey] = useState(0);

  useEffect(() => {
    setAssetType(lockedType ?? holding?.assetType ?? "stock");
    setDirty(false);
    setRenderKey((value) => value + 1);
  }, [holding?.assetType, lockedType]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  async function handleSubmit(payload: Record<string, unknown>) {
    await onSubmit(payload);
    setDirty(false);
  }

  function attemptCancel() {
    if (dirty && !window.confirm("You have unsaved changes. Discard them?")) {
      return;
    }
    setDirty(false);
    onCancel();
  }

  function switchType(nextType: AssetType) {
    if (nextType === assetType) return;
    if (dirty && !window.confirm("Switching asset type will reset this form. Continue?")) {
      return;
    }
    setAssetType(nextType);
    setDirty(false);
    setRenderKey((value) => value + 1);
  }

  const scopedHolding = holding?.assetType === assetType ? holding : null;
  const formProps = {
    mode,
    holding: scopedHolding,
    isSubmitting,
    error,
    onDirtyChange: setDirty,
    onSubmit: handleSubmit,
  };

  return (
    <div className="mx-auto max-w-lg px-4 pb-8 pt-6">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={attemptCancel}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 hover:text-white"
          style={{ background: "rgba(255,255,255,0.05)" }}
        >
          ←
        </button>
        <h1 className="text-xl font-extrabold text-white">{mode === "create" ? "Add Holding" : "Edit Holding"}</h1>
      </div>

      {!lockedType ? (
        <div className="mb-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Asset Type</p>
          <div className="grid grid-cols-2 gap-2">
            {(["stock", "mf", "commodity", "property"] as AssetType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => switchType(type)}
                className={`rounded-xl py-2.5 text-sm font-semibold transition-all ${
                  assetType === type
                    ? "border border-sky-500/30 bg-sky-500/20 text-sky-400"
                    : "border border-white/5 text-gray-500"
                }`}
              >
                {type === "mf" ? "MF" : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div key={`${assetType}-${renderKey}`}>
        {assetType === "stock" ? <StockHoldingForm {...formProps} /> : null}
        {assetType === "mf" ? <MutualFundHoldingForm {...formProps} /> : null}
        {assetType === "commodity" ? <CommodityHoldingForm {...formProps} /> : null}
        {assetType === "property" ? <PropertyHoldingForm {...formProps} /> : null}
      </div>
    </div>
  );
}
