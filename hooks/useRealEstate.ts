"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchLeaseById,
  fetchLeases,
  fetchMaintenanceTickets,
  fetchOwnerAnalytics,
  fetchProperties,
  fetchPropertyById,
  fetchRentLedger,
  fetchRentSummary,
  fetchTenantById,
  fetchTenants,
} from "@/lib/api/realEstate";
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
} from "@/lib/types/realEstate";
import { toErrorMessage } from "@/lib/fetcher";

type QueryOptions = {
  enabled?: boolean;
  cacheKey?: string;
  cacheTtlMs?: number;
};

type QueryState<T> = {
  data: T;
  loading: boolean;
  error: string | null;
  retrying: boolean;
  refresh: () => Promise<void>;
};

const DEFAULT_QUERY_CACHE_TTL = 15_000;
const realEstateCache = new Map<string, { data: unknown; updatedAt: number }>();
const realEstateInFlight = new Map<string, Promise<unknown>>();

function useRealEstateQuery<T>(
  loader: (signal?: AbortSignal) => Promise<T>,
  initialData: T,
  options: QueryOptions = {}
): QueryState<T> {
  const { enabled = true, cacheKey, cacheTtlMs = DEFAULT_QUERY_CACHE_TTL } = options;
  const readCached = useCallback((): T | null => {
    if (!cacheKey) return null;
    const entry = realEstateCache.get(cacheKey);
    if (!entry) return null;
    if (Date.now() - entry.updatedAt > cacheTtlMs) return null;
    return entry.data as T;
  }, [cacheKey, cacheTtlMs]);
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState(enabled && !readCached());
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runLoad = useCallback(
    async (background = false) => {
      if (!enabled) return;
      const cached = readCached();
      if (!background && cached !== null) {
        setData(cached);
        setLoading(false);
      }

      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      if (background) {
        setRetrying(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        let requestPromise: Promise<T>;
        if (cacheKey) {
          const existing = realEstateInFlight.get(cacheKey) as Promise<T> | undefined;
          requestPromise = existing ?? loader(ac.signal);
          if (!existing) {
            realEstateInFlight.set(cacheKey, requestPromise);
          }
        } else {
          requestPromise = loader(ac.signal);
        }
        const result = await requestPromise;
        if (cacheKey) {
          realEstateCache.set(cacheKey, { data: result, updatedAt: Date.now() });
        }
        setData(result);
      } catch (err) {
        // Expected when a query is superseded or the component unmounts.
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(toErrorMessage(err));
      } finally {
        if (cacheKey) {
          realEstateInFlight.delete(cacheKey);
        }
        setLoading(false);
        setRetrying(false);
      }
    },
    [cacheKey, enabled, loader, readCached]
  );

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  useEffect(() => {
    void runLoad(false);
    return () => {
      abortRef.current?.abort();
    };
  }, [runLoad]);

  return {
    data,
    loading,
    error,
    retrying,
    refresh: useCallback(() => runLoad(true), [runLoad]),
  };
}

export function useProperties(category: RealEstateCategory = "all") {
  const loader = useCallback((signal?: AbortSignal) => fetchProperties(signal, category), [category]);
  return useRealEstateQuery<PropertySummary[]>(loader, [], { cacheKey: `properties:${category}` });
}

export function useProperty(propertyId?: number) {
  const loader = useCallback((signal?: AbortSignal) => {
    if (!propertyId) return Promise.reject(new Error("Property id is required"));
    return fetchPropertyById(propertyId, signal);
  }, [propertyId]);

  const empty = useMemo<PropertyDetail>(() => ({
    id: 0,
    name: "",
    type: "office",
    address: "",
    occupancyStatus: "vacant",
    lifecycleStage: "acquired",
    purchaseValue: 0,
    currentValue: 0,
    roiPercent: 0,
    rentalYieldPercent: 0,
    noi: 0,
    tenantStatus: "",
    tenantCount: 0,
    leasedUnits: 0,
    totalUnits: 0,
    financials: {
      rentReceived: 0,
      pendingRent: 0,
      maintenanceExpenses: 0,
      propertyTax: 0,
      insurance: 0,
      monthlyCashflow: 0,
      yearlyPerformance: 0,
      noi: 0,
    },
    documents: [],
    photos: [],
  }), []);

  return useRealEstateQuery<PropertyDetail>(loader, empty, { enabled: Boolean(propertyId) });
}

export function useTenants(category: RealEstateCategory = "all") {
  const loader = useCallback((signal?: AbortSignal) => fetchTenants(signal, category), [category]);
  return useRealEstateQuery<TenantSummary[]>(loader, [], { cacheKey: `tenants:${category}` });
}

export function useTenant(tenantId?: number) {
  const loader = useCallback((signal?: AbortSignal) => {
    if (!tenantId) return Promise.reject(new Error("Tenant id is required"));
    return fetchTenantById(tenantId, signal);
  }, [tenantId]);

  const empty = useMemo<TenantDetail>(() => ({
    id: 0,
    propertyId: 0,
    status: "inactive",
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    rentAmount: 0,
    leaseStartDate: "",
    leaseEndDate: "",
    escalationSchedule: [],
    depositAmount: 0,
    complaints: [],
    paymentHistory: [],
    history: [],
  }), []);

  return useRealEstateQuery<TenantDetail>(loader, empty, { enabled: Boolean(tenantId) });
}

export function useLeases(category: RealEstateCategory = "all") {
  const loader = useCallback((signal?: AbortSignal) => fetchLeases(signal, category), [category]);
  return useRealEstateQuery<LeaseSummary[]>(loader, [], { cacheKey: `leases:${category}` });
}

export function useLease(leaseId?: number) {
  const loader = useCallback((signal?: AbortSignal) => {
    if (!leaseId) return Promise.reject(new Error("Lease id is required"));
    return fetchLeaseById(leaseId, signal);
  }, [leaseId]);

  const empty = useMemo<LeaseDetail>(() => ({
    id: 0,
    propertyId: 0,
    tenantId: 0,
    status: "active",
    startDate: "",
    endDate: "",
    lockInMonths: 0,
    rentAmount: 0,
    escalationPercent: 0,
    renewalReminderDays: 0,
    countdownDays: 0,
    timeline: [],
  }), []);

  return useRealEstateQuery<LeaseDetail>(loader, empty, { enabled: Boolean(leaseId) });
}

export function useRentLedger(category: RealEstateCategory = "all") {
  const loader = useCallback((signal?: AbortSignal) => fetchRentLedger(signal, category), [category]);
  return useRealEstateQuery<RentLedgerItem[]>(loader, [], { cacheKey: `rent-ledger:${category}` });
}

export function useRentSummary(category: RealEstateCategory = "all") {
  const loader = useCallback((signal?: AbortSignal) => fetchRentSummary(signal, category), [category]);
  return useRealEstateQuery<RentSummary>(
    loader,
    {
      rentCollected: 0,
      pendingRent: 0,
      overdueRent: 0,
      occupancyPercent: 0,
      yieldPercent: 0,
      noi: 0,
    },
    { cacheKey: `rent-summary:${category}` }
  );
}

export function useMaintenanceTickets(category: RealEstateCategory = "all") {
  const loader = useCallback(
    (signal?: AbortSignal) => fetchMaintenanceTickets(signal, category),
    [category]
  );
  return useRealEstateQuery<MaintenanceTicket[]>(loader, [], { cacheKey: `maintenance:${category}` });
}

export function useOwnerAnalytics(category: RealEstateCategory = "all") {
  const loader = useCallback((signal?: AbortSignal) => fetchOwnerAnalytics(signal, category), [category]);
  return useRealEstateQuery<OwnerAnalytics>(
    loader,
    {
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
    },
    { cacheKey: `owner-analytics:${category}` }
  );
}
