import type { PropertyType, RealEstateCategory } from "@/lib/types/realEstate";

export const REAL_ESTATE_CATEGORY_OPTIONS: Array<{ value: RealEstateCategory; label: string }> = [
  { value: "all", label: "All" },
  { value: "commercial", label: "Commercial" },
  { value: "residential", label: "Residential" },
  { value: "industrial", label: "Industrial" },
  { value: "retail", label: "Retail" },
  { value: "warehouse", label: "Warehouse" },
  { value: "land", label: "Land" },
  { value: "hospitality", label: "Hospitality" },
  { value: "co-working", label: "Co-working" },
];

const CATEGORY_SET = new Set<RealEstateCategory>(
  REAL_ESTATE_CATEGORY_OPTIONS.map((item) => item.value)
);

export function normalizeRealEstateCategory(value: unknown): RealEstateCategory {
  const normalized = String(value ?? "").trim().toLowerCase() as RealEstateCategory;
  return CATEGORY_SET.has(normalized) ? normalized : "all";
}

export function mapPropertyTypeToCategory(type: PropertyType): RealEstateCategory {
  switch (type) {
    case "commercial":
      return "commercial";
    case "residential":
      return "residential";
    case "industrial":
      return "industrial";
    case "retail":
      return "retail";
    case "warehouse":
      return "warehouse";
    case "land":
      return "land";
    case "hospitality":
      return "hospitality";
    case "office":
      return "commercial";
    case "mixed_use":
      return "commercial";
    default:
      return "commercial";
  }
}

export function categoryMatchesPropertyType(category: RealEstateCategory, type: PropertyType): boolean {
  if (category === "all") return true;
  return mapPropertyTypeToCategory(type) === category;
}
