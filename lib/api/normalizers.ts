export type ClientStatus = "active" | "inactive" | "suspended" | "archived";

type AnyRecord = Record<string, unknown>;

function toTrimmedString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toDecimal(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Number(numeric.toFixed(4));
}

function toIsoDate(value: unknown): string | null {
  const raw = toTrimmedString(value);
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function removeEmptyStringsAndUndefined(payload: AnyRecord): AnyRecord {
  const out: AnyRecord = {};
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value === "string" && value.trim() === "") continue;
    if (value === undefined) continue;
    out[key] = value;
  }
  return out;
}

function nullifyUndefined(payload: AnyRecord): AnyRecord {
  const out: AnyRecord = {};
  for (const [key, value] of Object.entries(payload)) {
    out[key] = value === undefined ? null : value;
  }
  return out;
}

function normalizeEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T
): T {
  const raw = toTrimmedString(value)?.toLowerCase() as T | undefined;
  return raw && (allowed as readonly string[]).includes(raw) ? raw : fallback;
}

export function normalizePropertyPayload(input: AnyRecord): AnyRecord {
  const normalized: AnyRecord = {
    id: toDecimal(input.id ?? input.property_id),
    client_id: toDecimal(input.client_id ?? input.clientId ?? input.user_id ?? input.userId),
    name: toTrimmedString(input.name ?? input.property_name),
    property_type: normalizeEnum(
      input.property_type ?? input.type,
      [
        "commercial",
        "residential",
        "industrial",
        "warehouse",
        "office",
        "retail",
        "land",
        "hospitality",
        "mixed_use",
        "other",
      ] as const,
      "commercial"
    ),
    category: toTrimmedString(input.category),
    address: toTrimmedString(input.address),
    occupancy_status: normalizeEnum(
      input.occupancy_status ?? input.occupancyStatus,
      ["fully_occupied", "partially_occupied", "vacant"] as const,
      "partially_occupied"
    ),
    lifecycle_stage: normalizeEnum(
      input.lifecycle_stage ?? input.lifecycleStage,
      ["acquired", "stabilizing", "operational", "value_add", "exit_ready"] as const,
      "operational"
    ),
    purchase_value: toDecimal(input.purchase_value ?? input.purchaseValue),
    current_value: toDecimal(input.current_value ?? input.currentValue),
    created_at: toIsoDate(input.created_at ?? input.createdAt),
    updated_at: toIsoDate(input.updated_at ?? input.updatedAt),
    tenant_count: toDecimal(input.tenant_count ?? input.tenantCount),
    total_units: toDecimal(input.total_units ?? input.totalUnits),
  };
  return nullifyUndefined(removeEmptyStringsAndUndefined(normalized));
}

export function normalizeClientPayload(input: AnyRecord): AnyRecord {
  const explicitStatus = input.status;
  const status = normalizeEnum<ClientStatus>(
    explicitStatus ?? (input.is_active ?? input.isActive ? "active" : "inactive"),
    ["active", "inactive", "suspended", "archived"] as const,
    "active"
  );

  return nullifyUndefined(
    removeEmptyStringsAndUndefined({
      id: toDecimal(input.id),
      name: toTrimmedString(input.name),
      email: toTrimmedString(input.email),
      phone: toTrimmedString(input.phone),
      status,
      created_at: toIsoDate(input.created_at ?? input.createdAt),
      updated_at: toIsoDate(input.updated_at ?? input.updatedAt),
    })
  );
}

export function normalizeAssetPayload(input: AnyRecord): AnyRecord {
  const type = normalizeEnum(
    input.type ?? input.asset_type,
    ["stock", "mutual_fund", "mf", "property", "real_estate", "commodity"] as const,
    "stock"
  );
  const canonicalType = type === "mf" ? "mutual_fund" : type === "real_estate" ? "property" : type;

  return nullifyUndefined(
    removeEmptyStringsAndUndefined({
      id: toDecimal(input.id),
      client_id: toDecimal(input.client_id ?? input.clientId ?? input.user_id ?? input.userId),
      type: canonicalType,
      symbol: toTrimmedString(input.symbol)?.toUpperCase() ?? null,
      fund_code: toTrimmedString(input.fund_code ?? input.fundCode)?.toUpperCase() ?? null,
      name: toTrimmedString(input.name),
      exchange: toTrimmedString(input.exchange)?.toUpperCase() ?? null,
      quantity: toDecimal(input.quantity),
      avg_price: toDecimal(input.avg_price ?? input.avgPrice),
      current_price: toDecimal(input.current_price ?? input.currentPrice),
      purchase_value: toDecimal(input.purchase_value ?? input.purchaseValue),
      current_value: toDecimal(input.current_value ?? input.currentValue),
      created_at: toIsoDate(input.created_at ?? input.createdAt),
      updated_at: toIsoDate(input.updated_at ?? input.updatedAt),
      tags: Array.isArray(input.tags)
        ? input.tags
            .map((item) => toTrimmedString(item))
            .filter((item): item is string => Boolean(item))
        : null,
    })
  );
}

export function normalizeTransactionPayload(input: AnyRecord): AnyRecord {
  return nullifyUndefined(
    removeEmptyStringsAndUndefined({
      id: toTrimmedString(input.id),
      client_id: toDecimal(input.client_id ?? input.clientId ?? input.user_id ?? input.userId),
      asset_id: toDecimal(input.asset_id ?? input.assetId),
      symbol: toTrimmedString(input.symbol)?.toUpperCase() ?? null,
      type: normalizeEnum(input.type, ["buy", "sell"] as const, "buy"),
      quantity: toDecimal(input.quantity),
      price: toDecimal(input.price),
      total: toDecimal(input.total),
      date: toIsoDate(input.date),
      created_at: toIsoDate(input.created_at ?? input.createdAt),
      updated_at: toIsoDate(input.updated_at ?? input.updatedAt),
    })
  );
}
