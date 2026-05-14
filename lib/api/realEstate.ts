import { ApiError, fetcher } from "@/lib/fetcher";
import { API_ROUTES } from "@/lib/constants/routes";
import {
  buildLeasePayload,
  buildPropertyPayload,
  buildTenantPayload,
  type LeasePayloadInput,
  type PropertyPayloadInput,
  type TenantPayloadInput,
} from "@/lib/payloads/realEstate";
import type {
  LeaseDetail,
  LeaseSummary,
  MaintenanceTicket,
  OwnerAnalytics,
  PropertyDetail,
  RealEstateCategory,
  PropertySummary,
  RentLedgerItem,
  RentSummary,
  TenantDetail,
  TenantSummary,
  WorkOrderTimelineEvent,
} from "@/lib/types/realEstate";
import { normalizeRealEstateCategory } from "@/lib/utils/realEstateCategory";

const ENDPOINTS = API_ROUTES.REAL_ESTATE;

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 250;

const mockProperties: PropertyDetail[] = [
  {
    id: 101,
    name: "Asraa Business Towers",
    type: "office",
    address: "BKC, Mumbai",
    occupancyStatus: "partially_occupied",
    lifecycleStage: "operational",
    purchaseValue: 145000000,
    currentValue: 179000000,
    roiPercent: 23.4,
    rentalYieldPercent: 8.9,
    noi: 1240000,
    tenantStatus: "12 active / 2 inactive",
    tenantCount: 14,
    leasedUnits: 28,
    totalUnits: 32,
    financials: {
      rentReceived: 2420000,
      pendingRent: 240000,
      maintenanceExpenses: 185000,
      propertyTax: 96000,
      insurance: 48000,
      monthlyCashflow: 1891000,
      yearlyPerformance: 15.7,
      noi: 1240000,
    },
    documents: [
      { id: 1, category: "agreements", title: "Master Lease Agreements" },
      { id: 2, category: "invoices", title: "April Tenant Invoices" },
      { id: 3, category: "tax_docs", title: "FY 25-26 Tax Docket" },
      { id: 4, category: "maintenance_bills", title: "HVAC Service Bills" },
      { id: 5, category: "property_photos", title: "Lobby and Facade" },
    ],
    photos: [
      // Mock-only external imagery for local/demo rendering when backend endpoints are unavailable.
      { id: 1, src: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80", alt: "Property tower exterior" },
      { id: 2, src: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80", alt: "Property interior workspace" },
    ],
  },
  {
    id: 102,
    name: "Asraa Retail Galleria",
    type: "retail",
    address: "Gachibowli, Hyderabad",
    occupancyStatus: "fully_occupied",
    lifecycleStage: "stabilizing",
    purchaseValue: 92000000,
    currentValue: 108000000,
    roiPercent: 17.3,
    rentalYieldPercent: 9.6,
    noi: 790000,
    tenantStatus: "9 active / 0 inactive",
    tenantCount: 9,
    leasedUnits: 18,
    totalUnits: 18,
    financials: {
      rentReceived: 1630000,
      pendingRent: 0,
      maintenanceExpenses: 132000,
      propertyTax: 64000,
      insurance: 39000,
      monthlyCashflow: 1395000,
      yearlyPerformance: 13.1,
      noi: 790000,
    },
    documents: [
      { id: 6, category: "agreements", title: "Retail Unit Agreements" },
      { id: 7, category: "invoices", title: "CAM Charge Invoices" },
      { id: 8, category: "property_photos", title: "Storefront Photos" },
    ],
    photos: [
      // Mock-only external imagery for local/demo rendering when backend endpoints are unavailable.
      { id: 3, src: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80", alt: "Retail mall interior" },
    ],
  },
];

const mockTenants: TenantDetail[] = [
  {
    id: 201,
    propertyId: 101,
    leaseId: 301,
    status: "active",
    companyName: "Nova Fintech Pvt Ltd",
    contactName: "Riya Sharma",
    email: "riya@novafintech.com",
    phone: "+91-9876543210",
    rentAmount: 240000,
    leaseStartDate: "2024-06-01",
    leaseEndDate: "2027-05-31",
    escalationSchedule: [
      { effectiveDate: "2025-06-01", increasePercent: 5 },
      { effectiveDate: "2026-06-01", increasePercent: 5.5 },
    ],
    depositAmount: 720000,
    complaints: [
      { id: 901, title: "HVAC cooling issue", status: "resolved", createdAt: "2026-02-10" },
      { id: 902, title: "Parking slot access", status: "open", createdAt: "2026-04-19" },
    ],
    paymentHistory: [
      { id: 1, month: "Jan 2026", amount: 240000, status: "paid", paidOn: "2026-01-04" },
      { id: 2, month: "Feb 2026", amount: 240000, status: "paid", paidOn: "2026-02-05" },
      { id: 3, month: "Mar 2026", amount: 240000, status: "pending" },
    ],
    history: [
      { id: 1, label: "Tenant onboarded", at: "2024-05-20" },
      { id: 2, label: "First escalation applied", at: "2025-06-01", note: "+5% rent revision" },
    ],
  },
  {
    id: 202,
    propertyId: 102,
    leaseId: 302,
    status: "inactive",
    companyName: "Urban Foods LLP",
    contactName: "Aman Khanna",
    email: "aman@urbanfoods.in",
    phone: "+91-9995552233",
    rentAmount: 180000,
    leaseStartDate: "2022-02-01",
    leaseEndDate: "2025-01-31",
    escalationSchedule: [{ effectiveDate: "2024-02-01", increasePercent: 4.5 }],
    depositAmount: 540000,
    complaints: [],
    paymentHistory: [
      { id: 4, month: "Dec 2024", amount: 180000, status: "paid", paidOn: "2024-12-02" },
    ],
    history: [
      { id: 3, label: "Lease completed", at: "2025-01-31", note: "Tenant exited on term completion" },
    ],
  },
];

const mockLeases: LeaseDetail[] = [
  {
    id: 301,
    propertyId: 101,
    tenantId: 201,
    status: "active",
    startDate: "2024-06-01",
    endDate: "2027-05-31",
    lockInMonths: 24,
    rentAmount: 240000,
    escalationPercent: 5,
    renewalReminderDays: 120,
    countdownDays: 382,
    timeline: [
      { id: 1, label: "Lease executed", at: "2024-05-20", status: "active" },
      { id: 2, label: "Lock-in complete", at: "2026-06-01", status: "active" },
      { id: 3, label: "Renewal reminder", at: "2027-01-31", status: "expiring" },
    ],
  },
  {
    id: 302,
    propertyId: 102,
    tenantId: 202,
    status: "expired",
    startDate: "2022-02-01",
    endDate: "2025-01-31",
    lockInMonths: 18,
    rentAmount: 180000,
    escalationPercent: 4.5,
    renewalReminderDays: 90,
    countdownDays: 0,
    timeline: [
      { id: 4, label: "Lease executed", at: "2022-01-20", status: "active" },
      { id: 5, label: "Lease expired", at: "2025-01-31", status: "expired" },
    ],
  },
];

const mockRentLedger: RentLedgerItem[] = [
  {
    id: 601,
    propertyId: 101,
    tenantId: 201,
    leaseId: 301,
    dueDate: "2026-03-05",
    month: "Mar 2026",
    amount: 240000,
    status: "pending",
    receiptNumber: "RCPT-10021",
  },
  {
    id: 602,
    propertyId: 101,
    tenantId: 201,
    leaseId: 301,
    dueDate: "2026-02-05",
    month: "Feb 2026",
    amount: 240000,
    status: "paid",
    paidAt: "2026-02-04",
    receiptNumber: "RCPT-10020",
  },
  {
    id: 603,
    propertyId: 102,
    tenantId: 202,
    leaseId: 302,
    dueDate: "2025-01-05",
    month: "Jan 2025",
    amount: 180000,
    status: "overdue",
    receiptNumber: "RCPT-9970",
  },
];

const mockMaintenance: MaintenanceTicket[] = [
  {
    id: 701,
    propertyId: 101,
    tenantId: 201,
    title: "Air handling unit vibration",
    description: "AHU in Block B has excessive vibration and noise.",
    status: "in_progress",
    priority: "high",
    vendor: "CoolAir Services",
    createdAt: "2026-04-12",
    updatedAt: "2026-04-14",
  },
  {
    id: 702,
    propertyId: 102,
    title: "Facade cleaning",
    description: "Quarterly exterior glass cleaning",
    status: "open",
    priority: "medium",
    vendor: "Sparkle Ops",
    createdAt: "2026-04-20",
  },
];

const mockMaintenanceTimeline: WorkOrderTimelineEvent[] = [
  { id: 1, ticketId: 701, label: "Ticket logged", at: "2026-04-12", status: "open" },
  { id: 2, ticketId: 701, label: "Vendor assigned", at: "2026-04-13", status: "in_progress" },
  { id: 3, ticketId: 702, label: "Inspection scheduled", at: "2026-04-21", status: "open" },
];

const mockAnalytics: OwnerAnalytics = {
  occupancyTrend: [
    { label: "Jan", value: 82 },
    { label: "Feb", value: 84 },
    { label: "Mar", value: 86 },
    { label: "Apr", value: 87 },
    { label: "May", value: 89 },
  ],
  rentTrend: [
    { label: "Jan", value: 2100000 },
    { label: "Feb", value: 2180000 },
    { label: "Mar", value: 2240000 },
    { label: "Apr", value: 2380000 },
    { label: "May", value: 2420000 },
  ],
  occupancyGraph: [
    { label: "Office", value: 92 },
    { label: "Retail", value: 98 },
    { label: "Warehouse", value: 71 },
  ],
  expenseBreakdown: [
    { label: "Maintenance", value: 185000 },
    { label: "Tax", value: 96000 },
    { label: "Insurance", value: 48000 },
    { label: "Utilities", value: 73000 },
  ],
  noiGrowth: [
    { label: "2022", value: 9600000 },
    { label: "2023", value: 10400000 },
    { label: "2024", value: 11200000 },
    { label: "2025", value: 12300000 },
  ],
  leaseExpiryAlerts: 3,
  propertyRoiPercent: 21.7,
  maintenanceCosts: 185000,
  cashflowForecast: [
    { label: "Jun", value: 1930000 },
    { label: "Jul", value: 1960000 },
    { label: "Aug", value: 2010000 },
    { label: "Sep", value: 2045000 },
  ],
  rentalYieldPercent: 9.1,
};

const mockRentSummary: RentSummary = {
  rentCollected: 2180000,
  pendingRent: 240000,
  overdueRent: 180000,
  occupancyPercent: 89,
  yieldPercent: 9.1,
  noi: 1240000,
};

function shouldUseMockData(error: unknown): boolean {
  return error instanceof ApiError && [404, 405].includes(error.status);
}

function shouldRetry(error: unknown): boolean {
  if (error instanceof ApiError) return RETRYABLE_STATUS.has(error.status);
  return error instanceof Error;
}

function shouldReturnSafeFallback(error: unknown): boolean {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) return false;
    return error.status >= 500 || error.status === 429;
  }
  return error instanceof Error;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(request: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      return await request();
    } catch (error) {
      lastError = error;
      if (!shouldRetry(error) || attempt === MAX_ATTEMPTS - 1) break;
      await delay(Math.min(RETRY_DELAY_MS * (2 ** attempt), 2_000));
    }
  }
  throw lastError;
}

function withCategory(endpoint: string, category?: RealEstateCategory): string {
  const normalized = normalizeRealEstateCategory(category);
  if (normalized === "all") return endpoint;
  const delimiter = endpoint.includes("?") ? "&" : "?";
  return `${endpoint}${delimiter}category=${encodeURIComponent(normalized)}`;
}

export async function fetchProperties(
  signal?: AbortSignal,
  category?: RealEstateCategory
): Promise<PropertySummary[]> {
  try {
    const res = await withRetry(() =>
      fetcher<PropertySummary[]>(withCategory(ENDPOINTS.PROPERTIES, category), {
        signal,
        cache: "no-store",
      })
    );
    return Array.isArray(res) ? res : [];
  } catch (error) {
    if (shouldUseMockData(error)) return mockProperties;
    if (shouldReturnSafeFallback(error)) return [];
    throw error;
  }
}

export async function fetchPropertyById(propertyId: number, signal?: AbortSignal): Promise<PropertyDetail> {
  try {
    return await withRetry(() =>
      fetcher<PropertyDetail>(`${ENDPOINTS.PROPERTIES}/${encodeURIComponent(propertyId)}`, {
        signal,
        cache: "no-store",
      })
    );
  } catch (error) {
    if (shouldUseMockData(error)) {
      const found = mockProperties.find((property) => property.id === propertyId);
      if (found) return found;
    }
    throw error;
  }
}

export function createProperty(input: PropertyPayloadInput, signal?: AbortSignal): Promise<PropertyDetail> {
  return fetcher<PropertyDetail>(ENDPOINTS.PROPERTIES, {
    method: "POST",
    body: buildPropertyPayload(input),
    signal,
  }).catch((err) => {
    if (err instanceof ApiError && err.status === 409) {
      throw new ApiError(409, err.message || "A property with this name already exists for this client.");
    }
    throw err;
  });
}

export function updateProperty(input: PropertyPayloadInput, signal?: AbortSignal): Promise<PropertyDetail> {
  if (!input.id) throw new Error("Property id is required for update");
  return fetcher<PropertyDetail>(`${ENDPOINTS.PROPERTIES}/${encodeURIComponent(input.id)}`, {
    method: "PATCH",
    body: buildPropertyPayload(input),
    signal,
  });
}

export async function fetchTenants(
  signal?: AbortSignal,
  category?: RealEstateCategory
): Promise<TenantSummary[]> {
  try {
    const res = await withRetry(() =>
      fetcher<TenantSummary[]>(withCategory(ENDPOINTS.TENANTS, category), {
        signal,
        cache: "no-store",
      })
    );
    return Array.isArray(res) ? res : [];
  } catch (error) {
    if (shouldUseMockData(error)) return mockTenants;
    if (shouldReturnSafeFallback(error)) return [];
    throw error;
  }
}

export async function fetchTenantById(tenantId: number, signal?: AbortSignal): Promise<TenantDetail> {
  try {
    return await fetcher<TenantDetail>(`${ENDPOINTS.TENANTS}/${encodeURIComponent(tenantId)}`, {
      signal,
      cache: "no-store",
    });
  } catch (error) {
    if (shouldUseMockData(error)) {
      const found = mockTenants.find((tenant) => tenant.id === tenantId);
      if (found) return found;
    }
    throw error;
  }
}

export function createTenant(input: TenantPayloadInput, signal?: AbortSignal): Promise<TenantDetail> {
  return fetcher<TenantDetail>(ENDPOINTS.TENANTS, {
    method: "POST",
    body: buildTenantPayload(input),
    signal,
  });
}

export function assignTenantToProperty(input: TenantPayloadInput, signal?: AbortSignal): Promise<TenantDetail> {
  if (!input.id) throw new Error("Tenant id is required for assignment");
  return fetcher<TenantDetail>(`${ENDPOINTS.TENANTS}/${encodeURIComponent(input.id)}/assign`, {
    method: "POST",
    body: buildTenantPayload(input),
    signal,
  });
}

export async function fetchLeases(
  signal?: AbortSignal,
  category?: RealEstateCategory
): Promise<LeaseSummary[]> {
  try {
    const res = await withRetry(() =>
      fetcher<LeaseSummary[]>(withCategory(ENDPOINTS.LEASES, category), {
        signal,
        cache: "no-store",
      })
    );
    return Array.isArray(res) ? res : [];
  } catch (error) {
    if (shouldUseMockData(error)) return mockLeases;
    if (shouldReturnSafeFallback(error)) return [];
    throw error;
  }
}

export async function fetchLeaseById(leaseId: number, signal?: AbortSignal): Promise<LeaseDetail> {
  try {
    return await fetcher<LeaseDetail>(`${ENDPOINTS.LEASES}/${encodeURIComponent(leaseId)}`, {
      signal,
      cache: "no-store",
    });
  } catch (error) {
    if (shouldUseMockData(error)) {
      const found = mockLeases.find((lease) => lease.id === leaseId);
      if (found) return found;
    }
    throw error;
  }
}

export function createLease(input: LeasePayloadInput, signal?: AbortSignal): Promise<LeaseDetail> {
  return fetcher<LeaseDetail>(ENDPOINTS.LEASES, {
    method: "POST",
    body: buildLeasePayload(input),
    signal,
  });
}

export function renewLease(leaseId: number, signal?: AbortSignal): Promise<LeaseDetail> {
  return fetcher<LeaseDetail>(`${ENDPOINTS.LEASES}/${encodeURIComponent(leaseId)}/renew`, {
    method: "POST",
    signal,
  });
}

export async function fetchRentLedger(
  signal?: AbortSignal,
  category?: RealEstateCategory
): Promise<RentLedgerItem[]> {
  try {
    const res = await withRetry(() =>
      fetcher<RentLedgerItem[]>(withCategory(`${ENDPOINTS.RENT}/ledger`, category), {
        signal,
        cache: "no-store",
      })
    );
    return Array.isArray(res) ? res : [];
  } catch (error) {
    if (shouldUseMockData(error)) return mockRentLedger;
    if (shouldReturnSafeFallback(error)) return [];
    throw error;
  }
}

export async function fetchRentSummary(
  signal?: AbortSignal,
  category?: RealEstateCategory
): Promise<RentSummary> {
  try {
    return await withRetry(() =>
      fetcher<RentSummary>(withCategory(`${ENDPOINTS.RENT}/summary`, category), {
        signal,
        cache: "no-store",
      })
    );
  } catch (error) {
    if (shouldUseMockData(error)) return mockRentSummary;
    if (shouldReturnSafeFallback(error)) {
      return {
        rentCollected: 0,
        pendingRent: 0,
        overdueRent: 0,
        occupancyPercent: 0,
        yieldPercent: 0,
        noi: 0,
      };
    }
    throw error;
  }
}

export async function fetchMaintenanceTickets(
  signal?: AbortSignal,
  category?: RealEstateCategory
): Promise<MaintenanceTicket[]> {
  try {
    const res = await withRetry(() =>
      fetcher<MaintenanceTicket[]>(withCategory(`${ENDPOINTS.MAINTENANCE}/tickets`, category), {
        signal,
        cache: "no-store",
      })
    );
    return Array.isArray(res) ? res : [];
  } catch (error) {
    if (shouldUseMockData(error)) return mockMaintenance;
    if (shouldReturnSafeFallback(error)) return [];
    throw error;
  }
}

export async function fetchWorkOrderTimeline(ticketId: number, signal?: AbortSignal): Promise<WorkOrderTimelineEvent[]> {
  try {
    const res = await withRetry(() =>
      fetcher<WorkOrderTimelineEvent[]>(
        `${ENDPOINTS.MAINTENANCE}/tickets/${encodeURIComponent(ticketId)}/timeline`,
        { signal, cache: "no-store" }
      )
    );
    return Array.isArray(res) ? res : [];
  } catch (error) {
    if (shouldUseMockData(error)) return mockMaintenanceTimeline.filter((item) => item.ticketId === ticketId);
    if (shouldReturnSafeFallback(error)) return [];
    throw error;
  }
}

export function updateMaintenanceStatus(
  ticketId: number,
  status: MaintenanceTicket["status"],
  signal?: AbortSignal
): Promise<MaintenanceTicket> {
  return fetcher<MaintenanceTicket>(`${ENDPOINTS.MAINTENANCE}/tickets/${encodeURIComponent(ticketId)}`, {
    method: "PATCH",
    body: { status },
    signal,
  });
}

export async function fetchOwnerAnalytics(
  signal?: AbortSignal,
  category?: RealEstateCategory
): Promise<OwnerAnalytics> {
  try {
    return await withRetry(() =>
      fetcher<OwnerAnalytics>(withCategory(ENDPOINTS.ANALYTICS, category), {
        signal,
        cache: "no-store",
      })
    );
  } catch (error) {
    if (shouldUseMockData(error)) return mockAnalytics;
    if (shouldReturnSafeFallback(error)) {
      return {
        occupancyTrend: [],
        rentTrend: [],
        occupancyGraph: [],
        expenseBreakdown: [],
        noiGrowth: [],
        leaseExpiryAlerts: 0,
        propertyRoiPercent: 0,
        maintenanceCosts: 0,
        cashflowForecast: [],
        rentalYieldPercent: 0,
      };
    }
    throw error;
  }
}
