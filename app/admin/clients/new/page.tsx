"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ClientEditForm } from "@/components/admin/ClientEditForm";
import { toErrorMessage } from "@/lib/fetcher";
import { ADMIN_CLIENTS_QUERY_KEY } from "@/lib/hooks/useAdminClients";
import { archiveClient, createClient, updateClientStatus, type ClientOperationalStatus, type ClientUpdatePayload } from "@/lib/services/clientService";

export default function NewClientPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <ClientEditForm
      mode="create"
      error={error}
      submitting={saving}
      onSubmit={async ({ status, ...payload }: ClientUpdatePayload & { status: ClientOperationalStatus }) => {
        try {
          setSaving(true);
          setError(null);
          const created = await createClient(payload);
          if (status === "archived") {
            await archiveClient(created.id);
          } else if (status !== "active") {
            await updateClientStatus(created.id, status);
          }
          await queryClient.invalidateQueries({ queryKey: ADMIN_CLIENTS_QUERY_KEY });
          router.push("/admin/clients");
        } catch (value) {
          setError(toErrorMessage(value));
        } finally {
          setSaving(false);
        }
      }}
    />
  );
}
