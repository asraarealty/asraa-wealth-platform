"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchTransactions, type Transaction } from "@/lib/api";
import { useAssets, useInsights } from "@/lib/hooks/useAssets";
import type { Asset } from "@/lib/types/assets";
import { createCanonicalAssetUniverse } from "@/lib/services/assets";
import { getMarketCapabilities, resolveLivePrices } from "@/lib/services/market";
import { computePortfolioIntelligenceState } from "@/lib/services/portfolio";

type EventType = "risk" | "cashflow" | "rent" | "drift" | "opportunity";

export interface EventItem {
  id: string;
  type: EventType;
  title: string;
  message: string;
  timestamp: string;
}

function money(v: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(v);
}

function classifyAlert(text: string): EventType {
  const t = text.toLowerCase();
  if (t.includes("risk") || t.includes("overexposed") || t.includes("loss")) return "risk";
  if (t.includes("rent") || t.includes("tenant") || t.includes("lease")) return "rent";
  if (t.includes("cash") || t.includes("income")) return "cashflow";
  if (t.includes("rebalance") || t.includes("drift")) return "drift";
  return "opportunity";
}

function rentSignals(properties: Asset[]): EventItem[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return properties
    .flatMap((p) => {
      const dueDate = p.rent_due_date ? new Date(p.rent_due_date) : null;
      if (!dueDate) return [];
      dueDate.setHours(0, 0, 0, 0);
      const days = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (days < 0 && !p.rent_received) {
        return [{
          id: `rent-overdue-${p.id}`,
          type: "rent" as const,
          title: `${p.name}: rent overdue`,
          message: `Rent for ${p.name} is overdue by ${Math.abs(days)} day(s).`,
          timestamp: new Date().toISOString(),
        }];
      }

      if (days >= 0 && days <= 5 && !p.rent_received) {
        return [{
          id: `rent-due-${p.id}`,
          type: "rent" as const,
          title: `${p.name}: rent due soon`,
          message: `Upcoming rent due in ${days} day(s).`,
          timestamp: new Date().toISOString(),
        }];
      }

      return [];
    })
    .slice(0, 10);
}

function transactionEvents(items: Transaction[]): EventItem[] {
  return items.slice(0, 10).map((t) => ({
    id: `txn-${t.id}`,
    type: "cashflow",
    title: `${t.type.toUpperCase()} ${t.symbol}`,
    message: `${t.quantity} units @ ${money(t.price)} (${money(t.total)})`,
    timestamp: t.date,
  }));
}

export function useOperatingSystemData() {
  const assetsQuery = useAssets();
  const insightsQuery = useInsights();

  const transactionsQuery = useQuery<Transaction[]>({
    queryKey: ["transactions", "me", "v2"],
    queryFn: () => fetchTransactions(),
  });

  const canonicalHoldings = useMemo(
    () => createCanonicalAssetUniverse(assetsQuery.data?.assets ?? []),
    [assetsQuery.data?.assets]
  );

  const livePricesQuery = useQuery({
    queryKey: [
      "market-pricing",
      canonicalHoldings.map((h) => `${h.id}:${h.type}:${h.symbol}:${h.currentPrice}`).join("|"),
    ],
    queryFn: () => resolveLivePrices(canonicalHoldings),
    enabled: canonicalHoldings.length > 0,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const marketCapabilitiesQuery = useQuery({
    queryKey: ["market-capabilities"],
    queryFn: () => getMarketCapabilities({ staleWhileRevalidate: true }),
    staleTime: 5 * 60_000,
  });

  const data = useMemo(() => {
    const assets = assetsQuery.data?.assets ?? [];
    const transactions = Array.isArray(transactionsQuery.data) ? transactionsQuery.data : [];
    const lastActivityAt = [
      ...transactions.map((tx) => tx.date),
      ...assets.map((asset) => asset.created_at),
    ]
      .filter(Boolean)
      .sort((a, b) => +new Date(String(b)) - +new Date(String(a)))[0];
    const intelligence = computePortfolioIntelligenceState({
      holdings: canonicalHoldings,
      livePriceMap: livePricesQuery.data ?? {},
      lastActivityAt: String(lastActivityAt ?? ""),
    });
    const summary = {
      total_value: intelligence.summary.totalValue,
      total_invested: intelligence.summary.totalInvested,
      total_return: intelligence.summary.totalReturn,
      return_percentage: intelligence.summary.returnPct,
      monthly_income: intelligence.summary.monthlyIncome,
      net_worth: intelligence.summary.netWorth,
    };
    const allocation = intelligence.allocation;
    const properties = assets.filter((a) => a.type === "property");
    const alerts = Array.isArray(insightsQuery.data?.alerts) ? insightsQuery.data.alerts : [];

    const computedRuleAlerts = [
      `Concentration: ${intelligence.rules.concentration.label}`,
      `Diversification: ${intelligence.rules.diversification.label}`,
      `Inactivity: ${intelligence.rules.inactivity.label}`,
      `Exposure imbalance: ${intelligence.rules.exposureImbalance.label}`,
    ];
    const typedAlerts: EventItem[] = [...computedRuleAlerts, ...alerts].slice(0, 12).map((alert, i) => {
      const text = typeof alert === "string" ? alert : String(alert);
      return {
        id: `alert-${i}-${text.slice(0, 12)}`,
        type: classifyAlert(text),
        title: text.length > 55 ? `${text.slice(0, 55)}…` : text,
        message: text,
        timestamp: new Date().toISOString(),
      };
    });

    const rentEvents = rentSignals(properties);
    const txnEvents = transactionEvents(transactions);

    const activityFeed = [...rentEvents, ...txnEvents, ...typedAlerts]
      .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))
      .slice(0, 25);

    const overdueRent = intelligence.realEstate.overdueRent;
    const dueSoonRent = intelligence.realEstate.dueSoonRent;

    const priorityActions = [
      overdueRent > 0
        ? {
            id: "rent-overdue",
            title: "Resolve overdue rent collections",
            description: `${overdueRent} properties require rent follow-up.`,
            severity: "high" as const,
          }
        : null,
      intelligence.rules.exposureImbalance.level !== "low"
        ? {
            id: "exposure-imbalance",
            title: "Exposure imbalance detected",
            description: intelligence.rules.exposureImbalance.label,
            severity: "medium" as const,
          }
        : null,
      intelligence.rules.inactivity.level === "high"
        ? {
            id: "inactivity-watch",
            title: "Client inactivity watch",
            description: intelligence.rules.inactivity.label,
            severity: "medium" as const,
          }
        : null,
      {
        id: "refresh-intelligence",
        title: "Refresh predictive intelligence",
        description: "Recompute recommendations for current allocation and risk profile.",
        severity: "low" as const,
      },
    ].filter(Boolean) as { id: string; title: string; description: string; severity: "low" | "medium" | "high" }[];

    const recommendations = [
      intelligence.rules.diversification.level !== "low"
        ? {
            id: "diversification",
            title: "Improve diversification profile",
            rationale: intelligence.rules.diversification.label,
            confidence: intelligence.rules.diversification.level === "high" ? 0.86 : 0.71,
          }
        : null,
      intelligence.rules.concentration.level !== "low"
        ? {
            id: "concentration",
            title: "Reduce concentration risk",
            rationale: intelligence.rules.concentration.label,
            confidence: intelligence.rules.concentration.level === "high" ? 0.88 : 0.74,
          }
        : null,
      dueSoonRent > 0
        ? {
            id: "cashflow-protection",
            title: "Prepare rent collection workflows",
            rationale: `${dueSoonRent} rents are due within five days.`,
            confidence: 0.71,
          }
        : null,
    ].filter(Boolean) as { id: string; title: string; rationale: string; confidence: number }[];

    const realEstate = {
      properties,
      totalValue: intelligence.realEstate.totalValue,
      monthlyRent: intelligence.realEstate.monthlyIncome,
      occupied: intelligence.realEstate.occupied,
      occupancyPct: intelligence.realEstate.occupancyPct,
      leaseExpiry: intelligence.realEstate.leaseExpiry,
      rentalYieldPct: intelligence.realEstate.rentalYieldPct,
      overdueRent,
      dueSoonRent,
    };

    const executive = {
      totalValue: summary.total_value,
      totalInvested: summary.total_invested,
      totalReturn: summary.total_return,
      returnPct: summary.return_percentage,
      monthlyIncome: summary.monthly_income,
      netWorth: summary.net_worth,
      riskState: intelligence.rules.riskState,
    };

    return {
      summary,
      allocation,
      assets,
      properties,
      transactions,
      typedAlerts,
      activityFeed,
      priorityActions,
      recommendations,
      realEstate,
      executive,
    };
  }, [
    assetsQuery.data,
    insightsQuery.data,
    transactionsQuery.data,
    canonicalHoldings,
    livePricesQuery.data,
    marketCapabilitiesQuery.data,
    livePricesQuery.isError,
  ]);

  const hasStockHoldings = canonicalHoldings.some((holding) => holding.type === "stock");
  const marketSyncNotice =
    hasStockHoldings &&
    (livePricesQuery.isError ||
      (marketCapabilitiesQuery.data
        ? !marketCapabilitiesQuery.data.stockQuotes && !marketCapabilitiesQuery.data.bulkQuotes
        : false))
      ? "Live market sync unavailable — using latest stored valuation."
      : null;

  return {
    data,
    isLoading:
      assetsQuery.isLoading ||
      insightsQuery.isLoading ||
      transactionsQuery.isLoading ||
      livePricesQuery.isLoading,
    isError:
      assetsQuery.isError ||
      insightsQuery.isError ||
      transactionsQuery.isError,
    marketSyncNotice,
    refetchAll: () => {
      assetsQuery.refetch();
      insightsQuery.refetch();
      transactionsQuery.refetch();
      livePricesQuery.refetch();
    },
  };
}
