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
  PropertySummary,
  RentLedgerItem,
  RentSummary,
  TenantDetail,
  TenantSummary,
} from "@/lib/types/realEstate";
import { toErrorMessage } from "@/lib/fetcher";

type QueryOptions = {
  enabled?: boolean;
};

type QueryState<T> = {
  data: T;
  loading: boolean;
  error: string | null;
  retrying: boolean;
  refresh: () => Promise<void>;
};

function useRealEstateQuery<T>(
  loader: (signal?: AbortSignal) => Promise<T>,
  initialData: T,
  deps: ReadonlyArray<unknown>,
  options: QueryOptions = {}
): QueryState<T> {
  const { enabled = true } = options;
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState(enabled);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runLoad = useCallback(
    async (background = false) => {
      if (!enabled) return;
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
        const result = await loader(ac.signal);
        setData(result);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(toErrorMessage(err));
      } finally {
        setLoading(false);
        setRetrying(false);
      }
    },
    [enabled, loader]
  );

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  useEffect(() => {
    void runLoad(false);
    return () => {
      abortRef.current?.abort();
    };
  }, [runLoad, ...deps]);

  return {
    data,
    loading,
    error,
    retrying,
    refresh: useCallback(() => runLoad(true), [runLoad]),
  };
}

export function useProperties() {
  return useRealEstateQuery<PropertySummary[]>(fetchProperties, [], []);
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

  return useRealEstateQuery<PropertyDetail>(loader, empty, [propertyId], { enabled: Boolean(propertyId) });
}

export function useTenants() {
  return useRealEstateQuery<TenantSummary[]>(fetchTenants, [], []);
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

  return useRealEstateQuery<TenantDetail>(loader, empty, [tenantId], { enabled: Boolean(tenantId) });
}

export function useLeases() {
  return useRealEstateQuery<LeaseSummary[]>(fetchLeases, [], []);
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

  return useRealEstateQuery<LeaseDetail>(loader, empty, [leaseId], { enabled: Boolean(leaseId) });
}

export function useRentLedger() {
  return useRealEstateQuery<RentLedgerItem[]>(fetchRentLedger, [], []);
}

export function useRentSummary() {
  return useRealEstateQuery<RentSummary>(
    fetchRentSummary,
    {
      rentCollected: 0,
      pendingRent: 0,
      overdueRent: 0,
      occupancyPercent: 0,
      yieldPercent: 0,
      noi: 0,
    },
    []
  );
}

export function useMaintenanceTickets() {
  return useRealEstateQuery<MaintenanceTicket[]>(fetchMaintenanceTickets, [], []);
}

export function useOwnerAnalytics() {
  return useRealEstateQuery<OwnerAnalytics>(
    fetchOwnerAnalytics,
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
    []
  );
}
