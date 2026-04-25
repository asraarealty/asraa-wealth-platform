import {
  fetchPortfolio,
  fetchPortfolioItems,
  fetchAdminPortfolio,
  type Portfolio,
  type PortfolioSummary,
  type AdminPortfolioItem,
} from "@/lib/api";
import { toErrorMessage } from "@/lib/fetcher";

/**
 * Fetch flat portfolio items for a specific client (or all clients when
 * clientId is omitted).  Always returns an array; never throws.
 */
export async function getPortfolioItems(
  clientId?: number,
  signal?: AbortSignal
): Promise<Portfolio[]> {
  try {
    const data = await fetchPortfolioItems(clientId, signal);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    console.error("[portfolioService] getPortfolioItems failed:", toErrorMessage(err));
    return [];
  }
}

/**
 * Fetch the portfolio summary for a specific client.
 */
export async function getPortfolio(
  clientId: number,
  signal?: AbortSignal
): Promise<PortfolioSummary> {
  return fetchPortfolio(clientId, signal);
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
