"use client";

export { useAdminClientsWorkspace as useAdminClients } from "@/domains/admin";
export { adminDomainQueryKeys as adminQueryKeys } from "@/domains/admin";
export const ADMIN_CLIENTS_QUERY_KEY = ["admin", "clients", "workspace"] as const;
export type { EnrichedClient, AdminClientsKPIs } from "@/lib/utils/adminClientIntelligence";
