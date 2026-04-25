import {
  fetchPortfolio,
  fetchAdminPortfolio,
  type PortfolioSummary,
  type AdminPortfolioItem,
} from "@/lib/api";

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
