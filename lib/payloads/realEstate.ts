import type {
  LeaseStatus,
  OccupancyStatus,
  PropertyLifecycleStage,
  PropertyType,
  TenantStatus,
} from "@/lib/types/realEstate";
import { normalizePropertyPayload } from "@/lib/api/normalizers";

function safeNumber(value: unknown): number {
  const n = typeof value === "string" ? parseFloat(value) : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function safeString(value: unknown): string {
  return String(value ?? "").trim();
}

export interface PropertyPayloadInput {
  clientId: number;
  id?: number;
  name: string;
  type: PropertyType;
  address: string;
  occupancyStatus: OccupancyStatus;
  lifecycleStage: PropertyLifecycleStage;
  purchaseValue: number | string;
  currentValue: number | string;
  tenantCount?: number | string;
  totalUnits?: number | string;
}

export interface CanonicalPropertyPayload {
  client_id: number;
  id?: number;
  name: string;
  property_type: PropertyType;
  category?: string | null;
  address: string;
  occupancy_status: OccupancyStatus;
  lifecycle_stage: PropertyLifecycleStage;
  purchase_value: number;
  current_value: number;
  tenant_count?: number;
  total_units?: number;
}

export function buildPropertyPayload(input: PropertyPayloadInput): CanonicalPropertyPayload {
  const payload = normalizePropertyPayload({
    client_id: Number(input.clientId),
    name: safeString(input.name),
    property_type: input.type,
    category: input.type,
    address: safeString(input.address),
    occupancy_status: input.occupancyStatus,
    lifecycle_stage: input.lifecycleStage,
    purchase_value: safeNumber(input.purchaseValue),
    current_value: safeNumber(input.currentValue),
  }) as CanonicalPropertyPayload;

  if (input.id !== undefined) payload.id = Number(input.id);
  if (input.tenantCount !== undefined) payload.tenant_count = safeNumber(input.tenantCount);
  if (input.totalUnits !== undefined) payload.total_units = safeNumber(input.totalUnits);

  return payload;
}

export interface TenantPayloadInput {
  clientId: number;
  id?: number;
  propertyId: number;
  leaseId?: number;
  status: TenantStatus;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  rentAmount: number | string;
  leaseStartDate: string;
  leaseEndDate: string;
  depositAmount?: number | string;
}

export interface CanonicalTenantPayload {
  client_id: number;
  tenant_id?: number;
  property_id: number;
  lease_id?: number;
  status: TenantStatus;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  rent_amount: number;
  lease_start_date: string;
  lease_end_date: string;
  deposit_amount?: number;
}

export function buildTenantPayload(input: TenantPayloadInput): CanonicalTenantPayload {
  const payload: CanonicalTenantPayload = {
    client_id: Number(input.clientId),
    property_id: Number(input.propertyId),
    status: input.status,
    company_name: safeString(input.companyName),
    contact_name: safeString(input.contactName),
    email: safeString(input.email),
    phone: safeString(input.phone),
    rent_amount: safeNumber(input.rentAmount),
    lease_start_date: safeString(input.leaseStartDate),
    lease_end_date: safeString(input.leaseEndDate),
  };

  if (input.id !== undefined) payload.tenant_id = Number(input.id);
  if (input.leaseId !== undefined) payload.lease_id = Number(input.leaseId);
  if (input.depositAmount !== undefined) payload.deposit_amount = safeNumber(input.depositAmount);

  return payload;
}

export interface LeasePayloadInput {
  clientId: number;
  id?: number;
  propertyId: number;
  tenantId: number;
  status: LeaseStatus;
  startDate: string;
  endDate: string;
  lockInMonths: number | string;
  rentAmount: number | string;
  escalationPercent: number | string;
  renewalReminderDays: number | string;
}

export interface CanonicalLeasePayload {
  client_id: number;
  lease_id?: number;
  property_id: number;
  tenant_id: number;
  status: LeaseStatus;
  start_date: string;
  end_date: string;
  lock_in_months: number;
  rent_amount: number;
  escalation_percent: number;
  renewal_reminder_days: number;
}

export function buildLeasePayload(input: LeasePayloadInput): CanonicalLeasePayload {
  const payload: CanonicalLeasePayload = {
    client_id: Number(input.clientId),
    property_id: Number(input.propertyId),
    tenant_id: Number(input.tenantId),
    status: input.status,
    start_date: safeString(input.startDate),
    end_date: safeString(input.endDate),
    lock_in_months: safeNumber(input.lockInMonths),
    rent_amount: safeNumber(input.rentAmount),
    escalation_percent: safeNumber(input.escalationPercent),
    renewal_reminder_days: safeNumber(input.renewalReminderDays),
  };

  if (input.id !== undefined) payload.lease_id = Number(input.id);

  return payload;
}
