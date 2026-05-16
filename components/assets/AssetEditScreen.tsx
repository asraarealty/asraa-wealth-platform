"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAssets, useUpdateAsset } from "@/lib/hooks/useAssets";
import type { AssetType } from "@/lib/types/assets";
import { AssetHoldingForm } from "@/components/assets/AssetHoldingForm";

interface AssetEditScreenProps {
  forceType?: AssetType;
}

export function AssetEditScreen({ forceType }: AssetEditScreenProps) {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { data, isLoading } = useAssets();
  const updateAsset = useUpdateAsset();
  const [error, setError] = useState<string | null>(null);

  const id = Number(params?.id ?? 0);
  const asset = useMemo(
    () => (data?.assets ?? []).find((a) => a.id === id) ?? null,
    [data?.assets, id]
  );

  if (isLoading) {
    return (
      <div className="px-4 pt-8 max-w-lg mx-auto text-slate-400 text-sm">Loading holding...</div>
    );
  }

  if (!asset) {
    return (
      <div className="px-4 pt-8 max-w-lg mx-auto space-y-3">
        <p className="text-white text-sm">Holding not found.</p>
        <button className="v2-action" onClick={() => router.push("/assets")}>
          Back to assets
        </button>
      </div>
    );
  }

  if (forceType && asset.type !== forceType) {
    return (
      <div className="px-4 pt-8 max-w-lg mx-auto space-y-3">
        <p className="text-white text-sm">
          This holding is not a {forceType} asset.
        </p>
        <button className="v2-action" onClick={() => router.push(`/assets/${asset.id}/edit`)}>
          Open generic editor
        </button>
      </div>
    );
  }

  return (
    <AssetHoldingForm
      mode="edit"
      initialAsset={asset}
      isSubmitting={updateAsset.isPending}
      error={error}
      onCancel={() => router.push("/assets")}
      onSubmit={async (payload) => {
        setError(null);
        try {
          await updateAsset.mutateAsync({ id: asset.id, payload });
          router.push("/assets");
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : "Failed to update asset");
        }
      }}
    />
  );
}

