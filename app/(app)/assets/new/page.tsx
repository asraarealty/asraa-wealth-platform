"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateAsset } from "@/lib/hooks/useAssets";
import { AssetHoldingForm } from "@/components/assets/AssetHoldingForm";

export default function AddAssetPage() {
  const router = useRouter();
  const createAsset = useCreateAsset();
  const [error, setError] = useState<string | null>(null);

  return (
    <AssetHoldingForm
      mode="create"
      isSubmitting={createAsset.isPending}
      error={error}
      onCancel={() => router.back()}
      onSubmit={async (payload) => {
        setError(null);
        try {
          await createAsset.mutateAsync(payload);
          router.push("/assets");
        } catch (err: unknown) {
          setError(err instanceof Error ? err.message : "Failed to create asset");
        }
      }}
    />
  );
}

