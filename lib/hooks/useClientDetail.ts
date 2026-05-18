"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchTransactions, fetchInsights } from "@/lib/api";
import type { Transaction, InsightsResponse } from "@/lib/api";
import { toErrorMessage } from "@/lib/fetcher";
import { useAuth } from "@/context/AuthContext";
import { adminQueryKeys } from "@/lib/queryKeys/admin";

function sanitizeToken(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeTransaction(value: unknown, index: number): Transaction | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const id = sanitizeToken(raw.id ?? raw.transaction_id);
  const rawType = String(raw.type ?? "").toLowerCase();
  const type: Transaction["type"] = rawType === "sell" || rawType === "buy" ? rawType : "buy";
  const quantity = Number(raw.quantity ?? raw.units ?? 0);
  const price = Number(raw.price ?? raw.avg_price ?? 0);
  const total = Number(raw.total ?? quantity * price);
  const dateValue = String(raw.date ?? raw.created_at ?? raw.createdAt ?? "").trim();
  const timestamp = new Date(dateValue).getTime();
  const fallbackId = [
    String(index),
    sanitizeToken(raw.symbol ?? raw.name ?? "asset"),
    sanitizeToken(raw.date ?? raw.created_at ?? raw.createdAt ?? "na"),
    sanitizeToken(raw.quantity ?? raw.units ?? "0"),
    sanitizeToken(raw.price ?? raw.avg_price ?? "0"),
    sanitizeToken(raw.total ?? "0"),
  ]
    .filter(Boolean)
    .join("-");

  return {
    id: id || `txn-${fallbackId}`,
    clientId: String(raw.clientId ?? raw.client_id ?? raw.user_id ?? ""),
    symbol: String(raw.symbol ?? raw.name ?? "N/A"),
    type,
    quantity: Number.isFinite(quantity) ? quantity : 0,
    price: Number.isFinite(price) ? price : 0,
    total: Number.isFinite(total) ? total : 0,
    date: Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : new Date().toISOString(),
  };
}

function normalizeInsights(value: unknown): InsightsResponse | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const equity = Number(raw.equityPercentage ?? raw.equity_percentage ?? 0);
  const property = Number(
    raw.propertyPercentage ??
      raw.property_percentage ??
      raw.real_estate_percentage ??
      0
  );
  const alerts = Array.isArray(raw.alerts) ? raw.alerts : [];
  return {
    equityPercentage: Number.isFinite(equity) ? equity : 0,
    propertyPercentage: Number.isFinite(property) ? property : 0,
    alerts,
  };
}

export interface ClientDetailData {
  transactions: Transaction[];
  insights: InsightsResponse | null;
  loading: boolean;
  error: string | null;
}

export function useClientDetail(
  clientId: number | null
): ClientDetailData {
  const { authReady, sessionHydrated, authenticated } = useAuth();
  const resolvedClientId = clientId ?? -1;
  const query = useQuery({
    queryKey: adminQueryKeys.clientDetail(resolvedClientId),
    queryFn: async ({ signal }) => {
      const [transactionsResult, insightsResult] = await Promise.allSettled([
        fetchTransactions(String(resolvedClientId), signal),
        fetchInsights(resolvedClientId, signal),
      ]);

      const transactions =
        transactionsResult.status === "fulfilled" && Array.isArray(transactionsResult.value)
          ? transactionsResult.value
              .map((entry, index) => normalizeTransaction(entry, index))
              .filter((entry): entry is Transaction => Boolean(entry))
          : [];
      const insights = insightsResult.status === "fulfilled" ? normalizeInsights(insightsResult.value) : null;

      const transactionError =
        transactionsResult.status === "rejected"
          ? toErrorMessage(transactionsResult.reason)
          : null;
      const insightsError =
        insightsResult.status === "rejected" ? toErrorMessage(insightsResult.reason) : null;

      return {
        transactions,
        insights,
        partialError: transactionError ?? insightsError,
      };
    },
    enabled: authReady && sessionHydrated && authenticated && clientId !== null,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 1,
  });

  return {
    transactions: query.data?.transactions ?? [],
    insights: query.data?.insights ?? null,
    loading: query.isPending,
    error: query.error ? toErrorMessage(query.error) : (query.data?.partialError ?? null),
  };
}
