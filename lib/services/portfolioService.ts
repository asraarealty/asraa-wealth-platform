import {
  fetchPortfolioItems,
  fetchAdminPortfolio,
  type Portfolio,
  type PortfolioMeta,
  type PortfolioResult,
  type AdminPortfolioItem,
} from "@/lib/api";
import { toErrorMessage } from "@/lib/fetcher";

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
 * Fetch all portfolio records for the admin panel.
 * Returns an empty array and logs a warning when the API returns a non-array.
 */
export async function getAdminPortfolio(
  signal?: AbortSignal
): Promise<AdminPortfolioItem[]> {
  const data = await fetchAdminPortfolio(signal);
  if (!Array.isArray(data)) {
    console.warn(
      "[portfolioService] getAdminPortfolio: expected array, got",
      typeof data
    );
    return [];
  }
  return data;
}
