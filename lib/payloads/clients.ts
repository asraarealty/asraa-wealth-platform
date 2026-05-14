import { normalizeClientPayload } from "@/lib/api/normalizers";

/**
 * Canonical client payload builders.
 *
 * Each builder sanitises its inputs and returns the exact snake_case shape
 * expected by the backend API. Forbidden fields (id, created_at, updated_at)
 * are never included in outgoing request bodies.
 */

// ── Create / Update Client ─────────────────────────────────────────────────

export interface ClientPayloadInput {
  name: string;
  email: string;
  phone?: string;
  status?: "active" | "inactive" | "suspended" | "archived";
}

export interface CanonicalClientPayload {
  name: string;
  email: string;
  phone?: string | null;
  status: "active" | "inactive" | "suspended" | "archived";
}

export function buildClientPayload(input: ClientPayloadInput): CanonicalClientPayload {
  return normalizeClientPayload({
    name: input.name,
    email: input.email,
    phone: input.phone,
    status: input.status ?? "active",
  }) as unknown as CanonicalClientPayload;
}

// ── Client Profile ──────────────────────────────────────────────────────────

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type InvestmentHorizon = "<1y" | "1-3y" | "3-5y" | "5y+";
export type GoalKey =
  | "wealth_growth"
  | "passive_income"
  | "retirement"
  | "property_purchase";

export interface ClientProfilePayloadInput {
  monthlyIncome?: number;
  investmentCapacity?: number;
  investmentHorizon?: InvestmentHorizon;
  riskLevel?: RiskLevel;
  goals?: GoalKey[];
}

export interface CanonicalClientProfilePayload {
  monthly_income?: number;
  investment_capacity?: number;
  investment_horizon?: InvestmentHorizon;
  risk_level?: RiskLevel;
  goals?: GoalKey[];
}

export function buildClientProfilePayload(
  input: ClientProfilePayloadInput
): CanonicalClientProfilePayload {
  const payload: CanonicalClientProfilePayload = {};
  if (input.monthlyIncome !== undefined) payload.monthly_income = input.monthlyIncome;
  if (input.investmentCapacity !== undefined) payload.investment_capacity = input.investmentCapacity;
  if (input.investmentHorizon !== undefined) payload.investment_horizon = input.investmentHorizon;
  if (input.riskLevel !== undefined) payload.risk_level = input.riskLevel;
  if (input.goals !== undefined) payload.goals = input.goals;
  return payload;
}
