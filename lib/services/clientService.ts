import {
  fetchClients,
  fetchAdminClients,
  type Client,
  type AdminClient,
} from "@/lib/api";

/**
 * Fetch the client list for the advisor dashboard sidebar.
 * Returns an empty array and logs a warning when the API returns a non-array.
 */
export async function getClients(signal?: AbortSignal): Promise<Client[]> {
  const data = await fetchClients(signal);
  if (!Array.isArray(data)) {
    console.warn("[clientService] getClients: expected array, got", typeof data);
    return [];
  }
  return data;
}

/**
 * Fetch the full client list for the admin panel.
 * Returns an empty array and logs a warning when the API returns a non-array.
 */
export async function getAdminClients(
  signal?: AbortSignal
): Promise<AdminClient[]> {
  const data = await fetchAdminClients(signal);
  if (!Array.isArray(data)) {
    console.warn(
      "[clientService] getAdminClients: expected array, got",
      typeof data
    );
    return [];
  }
  return data;
}
