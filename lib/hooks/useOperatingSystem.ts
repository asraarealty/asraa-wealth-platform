"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchTransactions, type Transaction } from "@/lib/api";
import { useAssets, useInsights } from "@/lib/hooks/useAssets";
import type { Asset } from "@/lib/types/assets";

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

  const data = useMemo(() => {
    const summary = assetsQuery.data?.summary ?? {
      total_value: 0,
      total_invested: 0,
      total_return: 0,
      return_percentage: 0,
    };

    const allocation = assetsQuery.data?.allocation ?? { stock: 0, mf: 0, property: 0 };
    const assets = assetsQuery.data?.assets ?? [];
    const properties = assets.filter((a) => a.type === "property");
    const alerts = Array.isArray(insightsQuery.data?.alerts) ? insightsQuery.data.alerts : [];
    const transactions = Array.isArray(transactionsQuery.data) ? transactionsQuery.data : [];

    const typedAlerts: EventItem[] = alerts.slice(0, 12).map((alert, i) => {
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

    const overdueRent = rentEvents.filter((e) => e.title.toLowerCase().includes("overdue")).length;
    const dueSoonRent = rentEvents.filter((e) => e.title.toLowerCase().includes("due soon")).length;

    const priorityActions = [
      overdueRent > 0
        ? {
            id: "rent-overdue",
            title: "Resolve overdue rent collections",
            description: `${overdueRent} properties require rent follow-up.`,
            severity: "high" as const,
          }
        : null,
      allocation.stock > 70
        ? {
            id: "equity-drift",
            title: "Portfolio drift detected",
            description: `Equity exposure at ${allocation.stock.toFixed(1)}%.`,
            severity: "medium" as const,
          }
        : null,
      summary.total_return < 0
        ? {
            id: "negative-return",
            title: "Protect downside risk",
            description: `Current return is ${summary.return_percentage.toFixed(2)}%. Review hedges.`,
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
      allocation.property < 15
        ? {
            id: "rebalance-property",
            title: "Increase real estate allocation",
            rationale: `Property allocation is ${allocation.property.toFixed(1)}%, below strategic floor of 15%.`,
            confidence: 0.79,
          }
        : null,
      allocation.stock > 65
        ? {
            id: "reduce-equity",
            title: "Trim concentrated equity exposure",
            rationale: "Current concentration increases volatility and drawdown probability.",
            confidence: 0.84,
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
      totalValue: properties.reduce((sum, p) => sum + (p.current_value ?? p.value ?? 0), 0),
      monthlyRent: properties.reduce((sum, p) => sum + (p.rent_amount ?? 0), 0),
      occupied: properties.filter((p) => Boolean(p.tenant_name)).length,
      overdueRent,
      dueSoonRent,
    };

    const executive = {
      totalValue: summary.total_value,
      totalInvested: summary.total_invested,
      totalReturn: summary.total_return,
      returnPct: summary.return_percentage,
      riskState: allocation.stock > 70 ? "High" : allocation.stock >= 45 ? "Medium" : "Low",
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
  }, [assetsQuery.data, insightsQuery.data, transactionsQuery.data]);

  return {
    data,
    isLoading: assetsQuery.isLoading || insightsQuery.isLoading || transactionsQuery.isLoading,
    isError: assetsQuery.isError || insightsQuery.isError || transactionsQuery.isError,
    refetchAll: () => {
      assetsQuery.refetch();
      insightsQuery.refetch();
      transactionsQuery.refetch();
    },
  };
}
