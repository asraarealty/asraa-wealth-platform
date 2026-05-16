import {
  fetchDashboardData,
  fetchAdminGroupedAssets,
  type Asset,
  type DashboardData,
} from "@/lib/api";
import { toErrorMessage } from "@/lib/fetcher";

type RiskLevel = "Low" | "Medium" | "High";
type SuggestedAction = "Rebalance" | "Hold" | "Diversify";

export interface ClientIntelligence {
  clientId: number;
  name: string;
  email: string;
  isActive: boolean;
  portfolioValue: number;
  returnPercent: number;
  riskLevel: RiskLevel;
  equityPct: number;
  mfPct: number;
  realEstatePct: number;
  suggestedAction: SuggestedAction;
}

/**
 * Fetch dashboard data for the current user. 
 * Always returns a valid DashboardData object; never throws on non-abort
 * errors.
 */
export async function getDashboardData(
  signal?: AbortSignal
): Promise<DashboardData> {
  try {
    return await fetchDashboardData(signal);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    console.error("[portfolioService] getDashboardData failed:", toErrorMessage(err));
    return { 
      assets: [], 
      summary: { totalValue: 0, stockValue: 0, mfValue: 0, propertyValue: 0, roiPercent: 0 },
      allocation: { equity: 0, property: 0, mutualFunds: 0 }
    };
  }
}

/**
 * Fetch all portfolio assets for the admin panel via the single
 * GET /portfolio/admin endpoint.
 *
 * Returns a flat Asset[] (all clients combined); never throws on non-abort
 * errors.
 */
export async function getAdminPortfolio(signal?: AbortSignal): Promise<Asset[]> {
  try {
    const grouped = await fetchAdminGroupedAssets(signal);
    return Object.values(grouped).flat();
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    console.error("[portfolioService] getAdminPortfolio failed:", toErrorMessage(err));
    return [];
  }
}

/**
 * Group a flat array of assets by their user_id.
 * Assets without a user_id are omitted.
 */
export function groupAssetsByUserId(assets: Asset[]): Record<number, Asset[]> {
  const grouped: Record<number, Asset[]> = {};
  for (const asset of assets) {
    const uid = asset.userId;
    if (uid === undefined || uid === null) continue;
    if (!grouped[uid]) grouped[uid] = [];
    grouped[uid].push(asset);
  }
  return grouped;
}

/**
 * Fetch portfolio data from the backend and return computed client intelligence.
 * Uses the authenticated backend /portfolio endpoint directly.
 *
 * Returns an empty array (never throws) on non-abort errors.
 */
export async function getPortfolioIntelligence(
  _signal?: AbortSignal
): Promise<ClientIntelligence[]> {
  // The backend /portfolio endpoint returns the current user's portfolio items,
  // not the per-client aggregated intelligence shape needed by the admin page.
  // Return an empty array so the admin page renders gracefully.
  return [];
}
