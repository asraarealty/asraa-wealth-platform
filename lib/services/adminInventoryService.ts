import { fetcher, ApiError } from "@/lib/fetcher";
import type { Asset, AssetType } from "@/lib/api";

export type AdminInventoryMutationAction = "create" | "update" | "delete";

export interface AdminInventoryMutationInput {
  action: AdminInventoryMutationAction;
  clientId: number;
  assetId?: number;
  payload?: Record<string, unknown>;
  signal?: AbortSignal;
}

function telemetry(event: string, payload: Record<string, unknown>) {
  try {
    console.info("[admin-inventory]", JSON.stringify({ event, at: new Date().toISOString(), ...payload }));
  } catch {}
}

function toFiniteNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toIsoDate(value: unknown): string | undefined {
  const text = toOptionalString(value);
  if (!text) return undefined;
  const parsed = new Date(text);
  if (!Number.isFinite(parsed.getTime())) return undefined;
  return text;
}

function normalizeAssetType(value: unknown): AssetType {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized === "mf" || normalized === "mutual_fund" || normalized === "mutual-fund") return "mf";
  if (normalized === "property" || normalized === "real_estate" || normalized === "real-estate") return "property";
  if (normalized === "commodity") return "commodity";
  return "stock";
}

function toBackendAssetType(type: AssetType): string {
  if (type === "property") return "real_estate";
  if (type === "mf") return "mutual_fund";
  return type;
}

export function normalizeAdminInventoryPayload(
  payload: Record<string, unknown>,
  clientId: number
): Record<string, unknown> {
  const type = normalizeAssetType(payload.type ?? payload.asset_type);
  const quantity = toFiniteNumber(payload.quantity);
  const units = toFiniteNumber(payload.units) ?? (type === "mf" ? quantity : undefined);
  const avgPrice = toFiniteNumber(payload.avg_price ?? payload.avgPrice);
  const nav = toFiniteNumber(payload.nav);
  const currentPrice = toFiniteNumber(payload.current_price ?? payload.currentPrice);
  const purchasePrice = toFiniteNumber(payload.purchase_price ?? payload.purchasePrice);
  const currentValue = toFiniteNumber(payload.current_value ?? payload.currentValue);
  const rentAmount = toFiniteNumber(payload.rent_amount ?? payload.rentAmount);
  const normalizedName = toOptionalString(payload.name) ?? (toOptionalString(payload.symbol) ?? "Unnamed asset");

  const body: Record<string, unknown> = {
    type,
    asset_type: toBackendAssetType(type),
    user_id: clientId,
    client_id: clientId,
    name: normalizedName,
    symbol: toOptionalString(payload.symbol),
    tags: Array.isArray(payload.tags) ? payload.tags : [],
  };

  if (type === "stock" || type === "commodity") {
    body.quantity = quantity ?? 0;
    body.avg_price = avgPrice ?? 0;
    body.current_price = currentPrice ?? avgPrice ?? 0;
  }

  if (type === "mf") {
    const resolvedUnits = units ?? quantity ?? 0;
    const resolvedNav = nav ?? avgPrice ?? currentPrice ?? 0;
    body.units = resolvedUnits;
    body.quantity = resolvedUnits;
    body.nav = resolvedNav;
    body.avg_price = resolvedNav;
    body.current_price = resolvedNav;
  }

  if (type === "property") {
    body.quantity = 1;
    body.location = toOptionalString(payload.location);
    body.purchase_price = purchasePrice ?? avgPrice ?? 0;
    body.current_value = currentValue ?? currentPrice ?? purchasePrice ?? 0;
    body.avg_price = purchasePrice ?? avgPrice ?? 0;
    body.current_price = currentValue ?? currentPrice ?? purchasePrice ?? avgPrice ?? 0;
    body.rent_amount = rentAmount;
    body.rent_due_date = toIsoDate(payload.rent_due_date ?? payload.rentDueDate);
    body.tenant_name = toOptionalString(payload.tenant_name ?? payload.tenantName);
    body.tenant_phone = toOptionalString(payload.tenant_phone ?? payload.tenantPhone);
    body.tenant_email = toOptionalString(payload.tenant_email ?? payload.tenantEmail);
    body.rent_received = payload.rent_received === undefined ? undefined : Boolean(payload.rent_received);
    body.last_paid_date = toIsoDate(payload.last_paid_date ?? payload.lastPaidDate);
  }

  return body;
}

async function requestWithFallback<T>(
  preferred: () => Promise<T>,
  fallback: () => Promise<T>
): Promise<T> {
  try {
    return await preferred();
  } catch (error) {
    if (error instanceof ApiError && [404, 405, 422, 501].includes(error.status)) {
      return fallback();
    }
    throw error;
  }
}

export async function mutateAdminInventory({
  action,
  clientId,
  assetId,
  payload,
  signal,
}: AdminInventoryMutationInput): Promise<Asset | void> {
  const mutationId = `${action}-${clientId}-${assetId ?? "new"}-${Date.now()}`;
  telemetry("mutation.start", { mutationId, action, clientId, assetId: assetId ?? null });
  try {
    if (action === "delete") {
      if (!assetId) throw new Error("Asset id is required for delete.");
      const deleteResult = await requestWithFallback(
        () => fetcher<void>(`/assets/admin/${encodeURIComponent(assetId)}`, { method: "DELETE", signal }),
        () => fetcher<void>(`/assets/${encodeURIComponent(assetId)}`, { method: "DELETE", signal })
      );
      telemetry("mutation.success", { mutationId, action, clientId, assetId });
      return deleteResult;
    }

    const normalized = normalizeAdminInventoryPayload(payload ?? {}, clientId);
    if (action === "create") {
      const created = await requestWithFallback(
        () => fetcher<Asset>("/assets/admin", { method: "POST", body: normalized, signal }),
        () => fetcher<Asset>("/assets", { method: "POST", body: normalized, signal })
      );
      telemetry("mutation.success", { mutationId, action, clientId, assetId: (created as Asset | undefined)?.id ?? null });
      return created;
    }

    if (!assetId) throw new Error("Asset id is required for update.");
    const updated = await requestWithFallback(
      () => fetcher<Asset>(`/assets/admin/${encodeURIComponent(assetId)}`, { method: "PATCH", body: normalized, signal }),
      () => fetcher<Asset>(`/assets/${encodeURIComponent(assetId)}`, { method: "PUT", body: normalized, signal })
    );
    telemetry("mutation.success", { mutationId, action, clientId, assetId: assetId });
    return updated;
  } catch (error) {
    telemetry("mutation.failure", {
      mutationId,
      action,
      clientId,
      assetId: assetId ?? null,
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
