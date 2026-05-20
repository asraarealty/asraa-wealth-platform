"use client";

import { useEffect } from "react";

// Fallback is pinned to the incident's expected production SHA for quick visual verification.
const FALLBACK_BUILD_SHA = "7767838f1ecd4bdc1bb7b64c1d1956ce45065c40";
const buildSha = (process.env.NEXT_PUBLIC_BUILD_SHA || FALLBACK_BUILD_SHA).trim();
const deployTimestamp = (process.env.NEXT_PUBLIC_DEPLOY_TIMESTAMP || "local").trim();

export function SurfaceDebugMarker({ surface }: { surface: string }) {
  useEffect(() => {
    console.info("[DEBUG_ACTIVE_SURFACE]", {
      surface,
      buildSha,
      deployTimestamp,
      renderedAt: new Date().toISOString(),
    });
  }, [surface]);

  return (
    <div className="w-full border-b-2 border-red-200 bg-red-600 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white">
      BUILD_SHA: {buildSha.slice(0, 8)} · DEPLOY_TIMESTAMP: {deployTimestamp} · DEBUG_SURFACE_ACTIVE: {surface}
    </div>
  );
}
