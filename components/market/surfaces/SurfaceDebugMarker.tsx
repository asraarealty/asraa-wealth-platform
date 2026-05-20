"use client";

import { useEffect } from "react";

// Incident: "VERCEL DEPLOYMENT TRACE + PRODUCTION BUNDLE VALIDATION" (2026-05-20).
// Remove or replace this fallback SHA after production verification is complete.
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
    <div
      className="w-full border-b-2 border-red-200 bg-red-600 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white"
      role="status"
      aria-live="polite"
      aria-label={`Debug active surface ${surface}, build ${buildSha.slice(0, 8)}, deploy timestamp ${deployTimestamp}`}
    >
      BUILD_SHA: {buildSha.slice(0, 8)} · DEPLOY_TIMESTAMP: {deployTimestamp} · DEBUG_SURFACE_ACTIVE: {surface}
    </div>
  );
}
