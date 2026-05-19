"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ClientProfile } from "@/lib/services/clientService";
import { approveClient, archiveClient, deleteClient, restoreClient, suspendClient } from "@/lib/services/clientService";
import type { EnrichedClient } from "@/lib/utils/adminClientIntelligence";
import { adminDomainQueryKeys } from "./queryKeys";
import { DASHBOARD_FULL_KEY } from "@/context/DashboardContext";
import { ASSETS_KEY } from "@/lib/hooks/useAssets";

export type AdminLifecycleAction = "approve" | "suspend" | "archive" | "restore" | "delete";

function toOptimisticClient(current: ClientProfile, action: AdminLifecycleAction): ClientProfile {
  if (action === "approve") {
    return {
      ...current,
      status: "approved",
      canonicalStatus: "approved",
      approvalStatus: "approved",
      onboardingStatus: "live",
      kycStatus: "approved",
      isArchived: false,
    };
  }
  if (action === "suspend") {
    return { ...current, status: "suspended", canonicalStatus: "suspended", isActive: false };
  }
  if (action === "archive") {
    return { ...current, status: "archived", canonicalStatus: "archived", isActive: false, isArchived: true };
  }
  if (action === "restore") {
    return { ...current, status: "active", canonicalStatus: "active", isActive: true, isArchived: false };
  }
  return current;
}

function toOptimisticEnrichedClient(current: EnrichedClient, action: AdminLifecycleAction): EnrichedClient {
  if (action === "delete") return current;
  const next = toOptimisticClient(current, action);
  return { ...current, ...next };
}

type MutationContext = {
  previousWorkspace?: { clients: EnrichedClient[]; kpis: unknown };
  previousProfile?: ClientProfile | null;
};

function matchesClientRuntimeQueryKey(key: unknown, resolvedClientId: number) {
  if (!Array.isArray(key)) return false;
  if (key[0] === "client-detail") return Number(key[1]) === resolvedClientId;
  return key.length >= 3 && key[0] === "admin" && key[1] === "clients" && key[2] === resolvedClientId;
}

export function useAdminClientLifecycleMutation(clientId: number | null) {
  const queryClient = useQueryClient();
  const resolvedClientId = clientId ?? -1;

  return useMutation<void | ClientProfile, Error, { action: AdminLifecycleAction; signal?: AbortSignal; currentStatus?: ClientProfile["canonicalStatus"] }, MutationContext>({
    mutationKey: ["admin", "clients", resolvedClientId, "lifecycle"],
    mutationFn: async ({ action, signal, currentStatus }) => {
      if (resolvedClientId <= 0) throw new Error("Invalid client ID: must be a positive integer.");
      if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
        console.info("[mutation]", { stage: "lifecycle.start", action, clientId: resolvedClientId });
      }
      if (action === "approve") return approveClient(resolvedClientId, signal);
      if (action === "suspend") return suspendClient(resolvedClientId, signal);
      if (action === "archive") return archiveClient(resolvedClientId, signal);
      if (action === "restore") return restoreClient(resolvedClientId, signal);
      await deleteClient(resolvedClientId, signal, currentStatus);
      return;
    },
    onMutate: async ({ action }) => {
      if (resolvedClientId <= 0) return {};
      await Promise.all([
        queryClient.cancelQueries({ queryKey: adminDomainQueryKeys.clientsWorkspace }),
        queryClient.cancelQueries({ queryKey: adminDomainQueryKeys.clientProfile(resolvedClientId) }),
        queryClient.cancelQueries({ queryKey: adminDomainQueryKeys.clientDetail(resolvedClientId) }),
        queryClient.cancelQueries({ queryKey: adminDomainQueryKeys.clientAssetPricing(resolvedClientId) }),
      ]);

      const previousWorkspace = queryClient.getQueryData<{ clients: EnrichedClient[]; kpis: unknown }>(
        adminDomainQueryKeys.clientsWorkspace
      );
      const previousProfile = queryClient.getQueryData<ClientProfile | null>(
        adminDomainQueryKeys.clientProfile(resolvedClientId)
      );

      if (action === "delete") {
        queryClient.setQueryData<{ clients: EnrichedClient[]; kpis: unknown } | undefined>(
          adminDomainQueryKeys.clientsWorkspace,
          (current) => {
            if (!current) return current;
            return {
              ...current,
              clients: current.clients.filter((entry) => entry.id !== resolvedClientId),
            };
          }
        );
        queryClient.removeQueries({ queryKey: adminDomainQueryKeys.clientProfile(resolvedClientId) });
        queryClient.removeQueries({ queryKey: adminDomainQueryKeys.clientDetail(resolvedClientId) });
        queryClient.removeQueries({ queryKey: adminDomainQueryKeys.clientEditDetail(resolvedClientId) });
        queryClient.removeQueries({ queryKey: adminDomainQueryKeys.clientAssetPricing(resolvedClientId) });
        queryClient.removeQueries({ queryKey: DASHBOARD_FULL_KEY });
        queryClient.removeQueries({ queryKey: ASSETS_KEY });
        queryClient.removeQueries({
          predicate: (query) => {
            return matchesClientRuntimeQueryKey(query.queryKey, resolvedClientId);
          },
        });
      } else {
        queryClient.setQueryData<ClientProfile | null | undefined>(
          adminDomainQueryKeys.clientProfile(resolvedClientId),
          (current) => (current ? toOptimisticClient(current, action) : current)
        );
        queryClient.setQueryData<{ clients: EnrichedClient[]; kpis: unknown } | undefined>(
          adminDomainQueryKeys.clientsWorkspace,
          (current) => {
            if (!current) return current;
            return {
              ...current,
              clients: current.clients.map((entry) =>
                entry.id === resolvedClientId ? toOptimisticEnrichedClient(entry, action) : entry
              ),
            };
          }
        );
      }

      return { previousWorkspace, previousProfile };
    },
    onError: (_error, _variables, context) => {
      if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
        console.info("[cache-reconcile]", { stage: "lifecycle.rollback", clientId: resolvedClientId });
      }
      if (context?.previousWorkspace) {
        queryClient.setQueryData(adminDomainQueryKeys.clientsWorkspace, context.previousWorkspace);
      }
      if (context?.previousProfile !== undefined) {
        queryClient.setQueryData(adminDomainQueryKeys.clientProfile(resolvedClientId), context.previousProfile);
      }
    },
    onSuccess: (data, { action }) => {
      if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
        console.info("[mutation]", { stage: "lifecycle.success", action, clientId: resolvedClientId });
      }
      if (action !== "delete" && data) {
        queryClient.setQueryData(adminDomainQueryKeys.clientProfile(resolvedClientId), data);
      }
    },
    onSettled: async (_data, _error, { action }) => {
      if (resolvedClientId <= 0) return;
      if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
        console.info("[cache-reconcile]", { stage: "lifecycle.invalidate.start", action, clientId: resolvedClientId });
      }
      const invalidations = [
        queryClient.invalidateQueries({ queryKey: adminDomainQueryKeys.clientsWorkspace }),
        queryClient.invalidateQueries({ queryKey: DASHBOARD_FULL_KEY }),
        queryClient.invalidateQueries({ queryKey: ASSETS_KEY }),
      ];
      if (action !== "delete") {
        invalidations.push(
          queryClient.invalidateQueries({ queryKey: adminDomainQueryKeys.clientProfile(resolvedClientId) }),
          queryClient.invalidateQueries({ queryKey: adminDomainQueryKeys.clientDetail(resolvedClientId) }),
          queryClient.invalidateQueries({ queryKey: adminDomainQueryKeys.clientEditDetail(resolvedClientId) }),
          queryClient.invalidateQueries({ queryKey: adminDomainQueryKeys.clientAssetPricing(resolvedClientId) })
        );
      } else {
        queryClient.removeQueries({ queryKey: adminDomainQueryKeys.clientProfile(resolvedClientId) });
        queryClient.removeQueries({ queryKey: adminDomainQueryKeys.clientDetail(resolvedClientId) });
        queryClient.removeQueries({ queryKey: adminDomainQueryKeys.clientEditDetail(resolvedClientId) });
        queryClient.removeQueries({ queryKey: DASHBOARD_FULL_KEY });
        queryClient.removeQueries({ queryKey: ASSETS_KEY });
        queryClient.removeQueries({
          predicate: (query) => {
            const key = query.queryKey;
            if (Array.isArray(key) && key[0] === "admin" && key[1] === "clients" && key[2] === resolvedClientId && key[3] === "asset-pricing") {
              return true;
            }
            return matchesClientRuntimeQueryKey(key, resolvedClientId);
          },
        });
      }
      await Promise.all(invalidations);
      if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
        console.info("[cache-reconcile]", { stage: "lifecycle.invalidate.success", action, clientId: resolvedClientId });
      }
    },
  });
}
