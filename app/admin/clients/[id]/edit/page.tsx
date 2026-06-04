"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClientEditForm } from "@/components/admin/ClientEditForm";
import { LoadingBlock, SurfaceCard } from "@/components/v2/ui";
import { toErrorMessage } from "@/lib/fetcher";
import { ADMIN_CLIENTS_QUERY_KEY } from "@/lib/hooks/useAdminClients";
import { adminQueryKeys } from "@/lib/queryKeys/admin";
import { toApiValidationErrorMessage } from "@/lib/apiValidationError";
import {
  archiveClient,
  fetchClientById,
  updateClient,
  updateClientStatus,
  type ClientOperationalStatus,
  type ClientUpdatePayload,
} from "@/lib/services/clientService";
import { useAuth } from "@/context/AuthContext";

export default function EditClientPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const clientId = useMemo(() => Number(params.id), [params.id]);
  const { authReady, sessionHydrated, authenticated } = useAuth();

  const query = useQuery({
    queryKey: adminQueryKeys.clientEditDetail(clientId),
    queryFn: () => fetchClientById(clientId),
    enabled: authReady && sessionHydrated && authenticated && Number.isFinite(clientId),
  });

  if (query.isLoading) return <LoadingBlock label="Loading client workspace…" />;

  if (query.error || !query.data) {
    return (
      <SurfaceCard className="p-6">
        <p className="text-sm font-semibold text-rose-300">Client workspace unavailable</p>
        <p className="mt-2 text-sm text-slate-400">{toErrorMessage(query.error)}</p>
      </SurfaceCard>
    );
  }

  return (
    <ClientEditForm
      mode="edit"
      client={query.data}
      error={saveError}
      submitting={saving}
      onSubmit={async ({ status, ...payload }: ClientUpdatePayload & { status: ClientOperationalStatus }) => {
        try {
          setSaving(true);
          setSaveError(null);
          await updateClient(clientId, payload);
          if (status === "archived") {
            await archiveClient(clientId);
          } else {
            await updateClientStatus(clientId, status, undefined, query.data.canonicalStatus);
          }
          await queryClient.invalidateQueries({ queryKey: ADMIN_CLIENTS_QUERY_KEY });
          await queryClient.invalidateQueries({ queryKey: adminQueryKeys.clientEditDetail(clientId) });
          router.push("/admin/clients");
        } catch (value) {
          setSaveError(toApiValidationErrorMessage(value));
        } finally {
          setSaving(false);
        }
      }}
    />
  );
}
