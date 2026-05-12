import {
  fetchClients,
  fetchAdminClients,
  fetcher,
  approveClient as apiApproveClient,
  deleteClient as apiDeleteClient,
  updateClient as apiUpdateClient,
  type Client,
  type AdminClient,
} from "@/lib/api";

export interface CreateClientPayload {
  name: string;
  email: string;
  password: string;
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
): Promise<unknown> => {
  // Backend expects snake_case keys
  const body: Record<string, unknown> = {};
  if (data.monthlyIncome !== undefined) body.monthly_income = data.monthlyIncome;
  if (data.investmentCapacity !== undefined) body.investment_capacity = data.investmentCapacity;
  if (data.investmentHorizon !== undefined) body.investment_horizon = data.investmentHorizon;
  if (data.riskLevel !== undefined) body.risk_level = data.riskLevel;
  if (data.goals !== undefined) body.goals = data.goals;
  return fetcher<unknown>(`/clients/${clientId}/profile`, {
    method: "POST",
    body,
  });
};

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
  if (!Array.isArray(data)) {
    console.warn("[clientService] getClients: expected array, got", typeof data);
    return [];
  }
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
  if (!Array.isArray(data)) {
    console.warn(
      "[clientService] getAdminClients: expected array, got",
      typeof data
    );
    return [];
  }
  return data.filter(isRealClient);
}

// ── Client mutations (one source of truth) ─────────────────────────────────

/**
 * Approve a client. Uses POST /clients/{id}/approve with a POST-body fallback.
 */
export function approveClient(id: number): Promise<void> {
  return apiApproveClient(id);
}

/**
 * Delete a client. Uses POST /clients/{id}/delete with a DELETE fallback.
 */
export function deleteClient(id: number, signal?: AbortSignal): Promise<void> {
  return apiDeleteClient(id, signal);
}

/**
 * Update arbitrary client fields via POST /clients/{id}.
 */
export function updateClient(
  id: number,
  data: Record<string, unknown>
): Promise<unknown> {
  return apiUpdateClient(id, data);
}
