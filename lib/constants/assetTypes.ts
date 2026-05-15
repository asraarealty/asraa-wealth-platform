export const FRONTEND_ASSET_TYPES = [
  "stock",
  "mf",
  "property",
  "commodity",
] as const;

export const BACKEND_ASSET_TYPES = [
  "stock",
  "mutual_fund",
  "property",
  "commodity",
] as const;

export type FrontendAssetType = (typeof FRONTEND_ASSET_TYPES)[number];
export type BackendAssetType = (typeof BACKEND_ASSET_TYPES)[number];

const FRONTEND_ASSET_TYPE_SET = new Set<string>(FRONTEND_ASSET_TYPES);
const BACKEND_ASSET_TYPE_SET = new Set<string>([
  ...BACKEND_ASSET_TYPES,
  "real_estate",
]);

function toNormalizedAssetType(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function toFrontendAssetType(
  value: unknown,
  fallback: FrontendAssetType = "stock"
): FrontendAssetType {
  const normalized = toNormalizedAssetType(value);
  if (!normalized) return fallback;
  if (normalized === "mutual_fund") return "mf";
  if (normalized === "real_estate") return "property";
  return FRONTEND_ASSET_TYPE_SET.has(normalized)
    ? (normalized as FrontendAssetType)
    : fallback;
}

export function toBackendAssetType(
  value: unknown,
  fallback: BackendAssetType = "stock"
): BackendAssetType {
  const normalized = toNormalizedAssetType(value);
  if (!normalized) return fallback;
  if (normalized === "mf") return "mutual_fund";
  if (normalized === "real_estate") return "property";
  return BACKEND_ASSET_TYPE_SET.has(normalized)
    ? (normalized === "real_estate" ? "property" : (normalized as BackendAssetType))
    : fallback;
}

export function requiresTicker(type: FrontendAssetType): boolean {
  return type !== "property";
}

export function normalizeAssetTicker(
  type: FrontendAssetType,
  value: unknown
): string | undefined {
  if (value === undefined || value === null) return undefined;
  const trimmed = String(value).trim();
  if (!trimmed) return undefined;
  return type === "property" ? trimmed : trimmed.toUpperCase();
}
