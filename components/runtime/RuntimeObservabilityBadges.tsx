"use client";

import { StatusPill } from "@/components/v2/ui";
import type { RuntimeStreamStatus } from "@/domains/market";

export function RuntimeObservabilityBadges({
  runtime,
  commodityUnavailable,
}: {
  runtime: RuntimeStreamStatus;
  commodityUnavailable?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <StatusPill
        label={runtime.connected ? "Stream connected" : "Stream disconnected"}
        tone={runtime.connected ? "success" : "danger"}
      />
      {runtime.replayActive ? <StatusPill label="Replay active" tone="info" /> : null}
      {runtime.staleRuntime ? <StatusPill label="Stale runtime warning" tone="warn" /> : null}
      {commodityUnavailable ? <StatusPill label="Commodity data temporarily unavailable" tone="warn" /> : null}
      {runtime.degradedSources.map((source) => (
        <StatusPill key={source} label={source} tone="warn" />
      ))}
    </div>
  );
}
