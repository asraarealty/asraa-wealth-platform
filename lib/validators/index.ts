import { z } from "zod";
import { toBackendAssetType } from "@/lib/constants/assetTypes";

const nonEmpty = z.string().trim().min(1, "Required");
const positiveNumberLike = z.union([z.number(), z.string()]).refine((value) => Number(value) > 0, {
  message: "Must be greater than 0",
});
const isoDate = z.string().trim().min(1, "Required").refine((value) => !Number.isNaN(new Date(value).getTime()), {
  message: "Invalid date",
});

export const propertySchema = z.object({
  name: nonEmpty,
  address: nonEmpty,
  property_type: z.enum([
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
  ]),
  occupancy_status: z.enum(["fully_occupied", "partially_occupied", "vacant"]),
  lifecycle_stage: z.enum(["acquired", "stabilizing", "operational", "value_add", "exit_ready"]),
  purchase_value: positiveNumberLike,
  current_value: positiveNumberLike,
});

export const clientSchema = z.object({
  name: nonEmpty,
  email: z.string().trim().email("Invalid email"),
  phone: z.string().trim().optional(),
  status: z.enum(["active", "inactive", "suspended", "archived"]),
});

export const assetSchema = z.object({
  client_id: z.number().positive(),
  type: z.enum(["stock", "mutual_fund", "property", "commodity"]),
  name: nonEmpty,
  symbol: z.string().trim().optional(),
  quantity: positiveNumberLike,
  avg_price: positiveNumberLike,
  current_price: positiveNumberLike,
});

export const mutualFundSchema = z.object({
  client_id: z.number().positive(),
  type: z.literal("mutual_fund"),
  fund_code: nonEmpty,
  name: nonEmpty,
  quantity: positiveNumberLike,
  avg_price: positiveNumberLike,
  current_price: positiveNumberLike,
});

const assetUpdateSchema = assetSchema.extend({
  client_id: z.number().positive().optional(),
});

const mutualFundUpdateSchema = mutualFundSchema.extend({
  client_id: z.number().positive().optional(),
});

export function validateAssetSubmissionPayload(
  payload: Record<string, unknown>,
  options: { requireClientId?: boolean } = {}
): string | null {
  const { requireClientId = true } = options;
  const type = toBackendAssetType(payload.type);
  const schema =
    type === "mutual_fund"
      ? requireClientId
        ? mutualFundSchema
        : mutualFundUpdateSchema
      : requireClientId
        ? assetSchema
        : assetUpdateSchema;
  const result = schema.safeParse(payload);
  if (result.success) return null;
  return result.error.issues[0]?.message ?? "Please check required fields";
}

export const tenantSchema = z.object({
  property_id: z.number().positive(),
  status: z.enum(["active", "inactive"]),
  company_name: nonEmpty,
  contact_name: nonEmpty,
  email: z.string().trim().email("Invalid email"),
  phone: nonEmpty,
  rent_amount: positiveNumberLike,
  lease_start_date: isoDate,
  lease_end_date: isoDate,
});

export const leaseSchema = z.object({
  property_id: z.number().positive(),
  tenant_id: z.number().positive(),
  status: z.enum(["active", "expiring", "expired", "renewed", "terminated"]),
  start_date: isoDate,
  end_date: isoDate,
  lock_in_months: positiveNumberLike,
  rent_amount: positiveNumberLike,
  escalation_percent: z.union([z.number(), z.string()]).refine((value) => Number(value) >= 0, {
    message: "Must be 0 or greater",
  }),
  renewal_reminder_days: positiveNumberLike,
});
