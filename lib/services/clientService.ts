import {
  fetchClients,
  fetchAdminClients,
  approveClient as apiApproveClient,
  deleteClient as apiDeleteClient,
  updateClient as apiUpdateClient,
  restoreClient as apiRestoreClient,
  type Client,
  type AdminClient,
} from "@/lib/api";
import { apiClient } from "@/lib/api/client";
import { API_ROUTES } from "@/lib/constants/routes";
import {
  buildClientPayload,
  buildClientProfilePayload,
  type ClientPayloadInput,
  type ClientProfilePayloadInput,
} from "@/lib/payloads/clients";

export type { ClientPayloadInput };

export const createClient = (
  data: ClientPayloadInput & { password: string }
): Promise<AdminClient> =>
  apiClient.post<AdminClient>(API_ROUTES.CLIENTS.BASE, {
    ...buildClientPayload(data),
    password: data.password,
  });

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type InvestmentHorizon = "<1y" | "1-3y" | "3-5y" | "5y+";
export type GoalKey =
  | "wealth_growth"
  | "passive_income"
  | "retirement"
  | "property_purchase";

export type { ClientProfilePayloadInput as ClientProfilePayload };

export const createClientProfile = (
  clientId: number,
  data: ClientProfilePayloadInput
): Promise<unknown> =>
  apiClient.post<unknown>(
    API_ROUTES.CLIENTS.PROFILE(clientId),
    buildClientProfilePayload(data)
  );

/** Basic email format check (filter out test/garbage data from the backend). */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Returns true if the client looks like real data (not a test/seed record). */
function isRealClient(c: { name: string; email: string }): boolean {
  if (c.name.trim().toLowerCase() === "string") return false;
  if (!isValidEmail(c.email)) return false;
  return true;
}

/**
 * Fetch the client list for the advisor dashboard sidebar.
 * Returns an empty array and logs a warning when the API returns a non-array.
 * Filters out test/seed records (name === "string" or invalid emails).
 */
export async function getClients(signal?: AbortSignal): Promise<Client[]> {
  const data = await fetchClients(signal);
  if (!Array.isArray(data)) return [];
  return data.filter(isRealClient);
}

/**
 * Fetch the full client list for the admin panel.
 * Returns an empty array and logs a warning when the API returns a non-array.
 * Filters out test/seed records (name === "string" or invalid emails).
 */
export async function getAdminClients(
  signal?: AbortSignal
): Promise<AdminClient[]> {
  const data = await fetchAdminClients(signal);
  if (!Array.isArray(data)) return [];
  return data.filter(isRealClient);
}

// ── Client mutations (one source of truth) ─────────────────────────────────

/**
 * Approve a client via PATCH /clients/{id}/approve.
 */
export function approveClient(id: number): Promise<void> {
  return apiApproveClient(id);
}

/**
 * Delete a client via DELETE /clients/{id}.
 */
export function deleteClient(id: number, signal?: AbortSignal): Promise<void> {
  return apiDeleteClient(id, signal);
}

/**
 * Update arbitrary client fields via PATCH /clients/{id}.
 */
export function updateClient(
  id: number,
  data: Record<string, unknown>
): Promise<unknown> {
  return apiUpdateClient(id, data);
}

/**
 * Restore an archived/inactive client via PATCH /clients/{id}/restore.
 */
export function restoreClient(id: number): Promise<void> {
  return apiRestoreClient(id);
}
