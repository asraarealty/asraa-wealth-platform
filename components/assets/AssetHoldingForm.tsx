"use client";

import type { Asset, AssetType } from "@/lib/types/assets";
import { HoldingFormShell } from "@/components/portfolio/forms/HoldingFormShell";

interface AssetHoldingFormProps {
  mode: "create" | "edit";
  initialAsset?: Asset | null;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  error?: string | null;
  lockedType?: AssetType;
}

export function AssetHoldingForm({
  mode,
  initialAsset,
  onSubmit,
  onCancel,
  isSubmitting = false,
  error = null,
  lockedType,
}: AssetHoldingFormProps) {
  return (
    <HoldingFormShell
      mode={mode}
      initialAsset={initialAsset}
      onSubmit={onSubmit}
      onCancel={onCancel}
      isSubmitting={isSubmitting}
      error={error}
      lockedType={lockedType}
    />
  );
}
