import {
  fetchPortfolioItems,
  fetchAdminPortfolio,
  type Portfolio,
  type PortfolioMeta,
  type PortfolioResult,
  type AdminPortfolioItem,
} from "@/lib/api";
import { getToken, toErrorMessage } from "@/lib/fetcher";
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
 * Fetch all portfolio records for the admin panel.
 * Returns an empty array and logs a warning when the API returns a non-array.
 */
export async function getAdminPortfolio(
  signal?: AbortSignal
): Promise<AdminPortfolioItem[]> {
  const data = await fetchAdminPortfolio(signal);
  console.log("Portfolio API (service):", data);
  if (!Array.isArray(data)) {
    console.warn(
      "[portfolioService] getAdminPortfolio: expected array, got",
      typeof data
    );
    return [];
  }
  return data;
}

/**
 * Fetch fully-computed client intelligence from the server-side Route Handler
 * `/api/portfolio/intelligence`.  The route enriches portfolio items with live
 * Yahoo Finance prices and runs analytics per client.
 *
 * Returns an empty array (never throws) on non-abort errors.
 */
export async function getPortfolioIntelligence(
  signal?: AbortSignal
): Promise<ClientIntelligence[]> {
  const token = getToken();
  try {
    const res = await fetch("/api/portfolio/intelligence", {
      headers: {
        Authorization: token ? `Bearer ${token}` : "",
        Accept: "application/json",
      },
      signal,
    });

    if (!res.ok) {
      throw new Error(`Intelligence API responded with ${res.status}`);
    }

    const data: unknown = await res.json();
    return Array.isArray(data) ? (data as ClientIntelligence[]) : [];
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    console.error(
      "[portfolioService] getPortfolioIntelligence failed:",
      toErrorMessage(err)
    );
    return [];
  }
}
