import {
  fetchClients,
  fetchAdminClients,
  fetcher,
  type Client,
  type AdminClient,
} from "@/lib/api";

export interface CreateClientPayload {
  name: string;
  email: string;
  phone?: string;
}

export const createClient = (
  data: CreateClientPayload
): Promise<AdminClient> =>
  fetcher<AdminClient>("/clients", {
    method: "POST",
    body: data,
  });

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type InvestmentHorizon = "<1y" | "1-3y" | "3-5y" | "5y+";
export type GoalKey =
  | "wealth_growth"
  | "passive_income"
  | "retirement"
  | "property_purchase";

export interface ClientProfilePayload {
  monthlyIncome?: number;
  investmentCapacity?: number;
  investmentHorizon?: InvestmentHorizon;
  riskLevel?: RiskLevel;
  goals?: GoalKey[];
}

export const createClientProfile = (
  clientId: number,
  data: ClientProfilePayload
): Promise<unknown> =>
  fetcher<unknown>(`/clients/${clientId}/profile`, {
    method: "POST",
    body: data,
  });

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
