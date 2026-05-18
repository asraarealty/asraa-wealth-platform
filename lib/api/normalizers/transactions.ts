import type { Transaction } from "@/lib/api";

function sanitizeToken(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function normalizeTransaction(value: unknown, index: number): Transaction | null {
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
