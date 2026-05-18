import type { AssetType } from "@/lib/api";

const KNOWN_ASSET_TYPES = new Set<string>(["stock", "mf", "property", "commodity"]);

export function normalizeAssetType(value: unknown): AssetType {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized === "real_estate" || normalized === "real-estate") return "property";
  if (normalized === "mutual_fund" || normalized === "mutual-fund") return "mf";
  if (KNOWN_ASSET_TYPES.has(normalized)) return normalized as AssetType;
  return "stock";
}

export function toBackendAssetType(type: AssetType): string {
  if (type === "property") return "real_estate";
  if (type === "mf") return "mutual_fund";
  return type;
}
