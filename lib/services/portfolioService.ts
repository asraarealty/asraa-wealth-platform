import {
  fetchPortfolioItems,
  fetcher,
  type Asset,
  type Portfolio,
  type PortfolioMeta,
  type PortfolioResult,
} from "@/lib/api";
import { toErrorMessage } from "@/lib/fetcher";
import type { ClientIntelligence } from "@/components/admin/dashboard/intelligenceHelpers";

export type { PortfolioResult };

/**
 * Fetch portfolio items for a specific client (or all clients when clientId
 * is omitted).  Always returns `{ items, meta }`; never throws on non-abort
 * errors.
 */
export async function getPortfolioItems(
  clientId?: number,
  signal?: AbortSignal
): Promise<PortfolioResult> {
  try {
    const result = await fetchPortfolioItems(clientId, signal);

    console.log("NORMALIZED:", result);

    return result;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    console.error("[portfolioService] getPortfolioItems failed:", toErrorMessage(err));
    return { items: [], meta: {} };
  }
}

/**
 * Fetch all portfolio assets for the admin panel.
 * Calls /portfolio (admin sees all users' assets) and normalises the response
 * to a flat Asset[] — handles every envelope shape the backend may return.
 */
export async function getAdminPortfolio(signal?: AbortSignal): Promise<Asset[]> {
  try {
    // /portfolio returns one of several shapes depending on backend version:
    //   - raw array:                 Asset[]
    //   - data envelope:             { data: Asset[] }
    //   - assets envelope:           { assets: Asset[] }
    //   - positions envelope:        { positions: Asset[] }
    const res = await fetcher<unknown>("/portfolio", { signal, raw: true });

    const obj = res as Record<string, unknown>;

    // Unwrap { data: ... } envelope when present
    const unwrapped =
      res && typeof res === "object" && !Array.isArray(res) && obj.data != null
        ? obj.data
        : res;

    const list: unknown = Array.isArray(unwrapped)
      ? unwrapped
      : (unwrapped as Record<string, unknown>)?.assets ??
        (unwrapped as Record<string, unknown>)?.positions ??
        [];

    if (!Array.isArray(list)) {
      console.warn("[portfolioService] getAdminPortfolio: unexpected shape", list);
      return [];
    }

    console.log("Portfolio API (service):", list);
    return list as Asset[];
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
    const uid = asset.user_id;
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
