"use client";

import { useEffect, useMemo, useState } from "react";

export type WorkspaceStatusFilter =
  | "all"
  | "lead"
  | "onboarding"
  | "pending_kyc"
  | "approved"
  | "active"
  | "suspended"
  | "archived";

export function useAdminWorkspaceState<T extends { status?: string; name?: string; email?: string; phone?: string; relationshipManager?: string; leadSource?: string; campaignSegmentation?: string; tags?: string[] }>(
  clients: T[],
  defaults: { pageSize: number }
) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<WorkspaceStatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaults.pageSize);

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();
    return clients.filter((client) => {
      const matchesSearch =
        !query ||
        [
          client.name,
          client.email,
          client.phone,
          client.relationshipManager,
          client.leadSource,
          client.campaignSegmentation,
          (client.tags ?? []).join(" "),
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      const matchesStatus = statusFilter === "all" || client.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [clients, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / pageSize));
  const paginatedClients = filteredClients.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  return {
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    page,
    setPage,
    pageSize,
    setPageSize,
    filteredClients,
    paginatedClients,
    totalPages,
  };
}
