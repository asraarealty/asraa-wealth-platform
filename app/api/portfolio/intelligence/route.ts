/**
 * GET /api/portfolio/intelligence
 *
 * Server-side Route Handler that:
 *   1. Fetches all clients from the backend
 *   2. Fetches each client's portfolio in parallel
 *   3. Batch-fetches live stock prices from Yahoo Finance (with caching)
 *   4. Enriches portfolio items with live INR prices (falls back to avg_price)
 *   5. Runs portfolio analytics per client
 *   6. Returns a ClientIntelligence-shaped JSON array
 *
 * The caller must forward the user's Bearer token in the Authorization header.
 * All portfolio values are expressed in INR.
 */

import { NextRequest, NextResponse } from "next/server";
import { getBatchStockPrices } from "@/lib/services/marketData";
import { computePortfolioMetrics, computeRiskScore } from "@/lib/analytics";

// ── Config ───────────────────────────────────────────────────────────────────

const BACKEND =
  process.env.BACKEND_URL ??
  "http://localhost:8000";

// ── Types (local, avoids circular imports) ───────────────────────────────────

interface BackendClient {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
}

interface BackendPortfolioItem {
  id: number;
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  value: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Forward an authenticated request to the backend. */
async function backendGet<T>(path: string, authHeader: string): Promise<T> {
  const res = await fetch(`${BACKEND}${path}`, {
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Backend ${path} responded with ${res.status}`);
  }

  const json: unknown = await res.json();

  // Unwrap { success, data } or { data } envelope if present
  if (
    json !== null &&
    typeof json === "object" &&
    !Array.isArray(json)
  ) {
    const obj = json as Record<string, unknown>;
    // { success: true, data: T }
    if ("success" in obj && "data" in obj) {
      return obj.data as T;
    }
    // { data: T }
    if ("data" in obj) {
      return obj.data as T;
    }
  }

  return json as T;
}

/** True for stock-market symbols (not mutual-fund IDs or real-estate codes). */
function isStockSymbol(symbol: string): boolean {
  return !symbol.startsWith("PROP-") && !/^\d+$/.test(symbol);
}

type SuggestedAction = "Rebalance" | "Hold" | "Diversify";

function toSuggestedAction(
  equityPct: number,
  mfPct: number,
  realEstatePct: number
): SuggestedAction {
  if (equityPct > 65) return "Rebalance";
  if (mfPct < 15 && realEstatePct < 10) return "Diversify";
  return "Hold";
}

/** Parse a backend portfolio response into a flat array of items. */
function parsePortfolioResponse(raw: unknown): BackendPortfolioItem[] {
  if (Array.isArray(raw)) return raw as BackendPortfolioItem[];
  if (raw !== null && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    // New format: { data: { assets: [...] } } or already-unwrapped { assets: [...] }
    if (obj.assets && Array.isArray(obj.assets)) return obj.assets as BackendPortfolioItem[];
    if (obj.data && typeof obj.data === "object") {
      const data = obj.data as Record<string, unknown>;
      if (Array.isArray(data.assets)) return data.assets as BackendPortfolioItem[];
      if (Array.isArray(data)) return data as BackendPortfolioItem[];
    }
    if (Array.isArray(obj.positions)) return obj.positions as BackendPortfolioItem[];
  }
  return [];
}

/**
 * Safely convert a value to a finite number, defaulting to 0 when null/
 * undefined/NaN/Infinity is encountered.
 */
function safeNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// ── Route Handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization") ?? "";
  if (!authHeader) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Fetch all clients
    // NOTE: The BACKEND_URL already points at the raw backend (e.g. http://localhost:8000).
    // Next.js rewrites strip the /api/v2 prefix, so when calling the backend directly
    // we must NOT include that prefix in the path.
    let clients: BackendClient[];
    try {
      const raw = await backendGet<BackendClient[]>("/clients", authHeader);
      clients = Array.isArray(raw) ? raw : [];
    } catch {
      // Backend unreachable or returned an error — return empty intelligence
      return NextResponse.json([]);
    }

    if (clients.length === 0) {
      return NextResponse.json([]);
    }

    // 2. Fetch each client's portfolio in parallel (failures → empty array)
    const portfolioSettled = await Promise.allSettled(
      clients.map(async (client) => {
        const raw = await backendGet<unknown>(
          `/assets?user_id=${client.id}`,
          authHeader
        );
        const items = parsePortfolioResponse(raw);
        return { clientId: client.id, items };
      })
    );

    const clientPortfolios = new Map<number, BackendPortfolioItem[]>();
    for (let i = 0; i < clients.length; i++) {
      const result = portfolioSettled[i];
      clientPortfolios.set(
        clients[i].id,
        result.status === "fulfilled" ? result.value.items : []
      );
    }

    // 3. Collect unique stock symbols across all clients and batch-fetch prices
    const allStockSymbols = new Set<string>();
    for (const items of clientPortfolios.values()) {
      for (const item of items) {
        if (isStockSymbol(item.symbol)) {
          allStockSymbols.add(item.symbol);
        }
      }
    }
    const priceMap = await getBatchStockPrices([...allStockSymbols]);

    // 4. Enrich items and run analytics per client
    const intelligenceRows = clients.map((client) => {
      const rawItems = clientPortfolios.get(client.id) ?? [];

      // Enrich: replace currentPrice with live INR price for equity symbols
      const enrichedItems = rawItems.map((item) => {
        if (!isStockSymbol(item.symbol)) return item;
        const livePrice = priceMap.get(item.symbol);
        if (livePrice === undefined) return item;
        // Always use INR for portfolio value calculations
        const priceInr = safeNum(livePrice.priceINR);
        return {
          ...item,
          currentPrice: priceInr,
          value: priceInr * safeNum(item.quantity),
        };
      });

      // Map backend items to the camelCase PortfolioItem shape expected by analytics.
      // Use safeNum() to ensure null/undefined fields default to 0.
      const portfolioItems = enrichedItems.map((item) => ({
        symbol: item.symbol ?? "",
        quantity: safeNum(item.quantity),
        avgPrice: safeNum(item.avgPrice),
        currentPrice: safeNum(item.currentPrice),
      }));

      const metrics = computePortfolioMetrics(portfolioItems);
      const { allocation, riskLevel } = computeRiskScore(portfolioItems);

      return {
        clientId: client.id,
        name: client.name,
        email: client.email,
        isActive: client.isActive,
        portfolioValue: metrics.current,
        returnPercent: parseFloat(metrics.returnPct.toFixed(1)),
        riskLevel,
        equityPct: allocation.equity,
        mfPct: allocation.mf,
        realEstatePct: allocation.realEstate,
        suggestedAction: toSuggestedAction(
          allocation.equity,
          allocation.mf,
          allocation.realEstate
        ),
      };
    });

    return NextResponse.json(intelligenceRows);
  } catch (err) {
    console.error("[/api/portfolio/intelligence] Error:", err);
    return NextResponse.json(
      { error: "Failed to compute portfolio intelligence" },
      { status: 500 }
    );
  }
}
