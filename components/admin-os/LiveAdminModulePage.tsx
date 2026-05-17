"use client";

import { AdminModulePage } from "@/components/admin-os/AdminModulePage";
import { LoadingBlock } from "@/components/v2/ui";
import { useAdminClients, type AdminClientsKPIs, type EnrichedClient } from "@/lib/hooks/useAdminClients";

type ModuleMetric = {
  label: string;
  value: string;
  tone: "info" | "success" | "warn" | "danger";
};

export function LiveAdminModulePage({
  title,
  description,
  workflow,
  buildMetrics,
}: {
  title: string;
  description: string;
  workflow: string[];
  buildMetrics: (clients: EnrichedClient[], kpis: AdminClientsKPIs) => ModuleMetric[];
}) {
  const { clients, kpis, loading } = useAdminClients();
  if (loading) return <LoadingBlock label={`Loading ${title} module...`} />;

  return (
    <AdminModulePage
      title={title}
      description={description}
      metrics={buildMetrics(clients, kpis)}
      workflow={workflow}
    />
  );
}
