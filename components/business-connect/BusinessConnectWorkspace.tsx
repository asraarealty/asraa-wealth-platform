"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, fetcher, toErrorMessage } from "@/lib/fetcher";
import { EmptyBlock, SectionHeader, StatusPill, SurfaceCard } from "@/components/v2/ui";

type BusinessProfile = {
  id: string | number | null;
  businessName: string;
  ownerName: string;
  industry: string;
  city: string;
  state: string;
  country: string;
  monthlyRevenue: string;
  monthlyExpense: string;
  employeeCount: string;
  customerCount: string;
  website: string;
  growthGoal: string;
};

type MetricEntry = {
  id: string | number;
  reportingMonth: string;
  revenue: number;
  expense: number;
  profit: number;
  customerCount: number;
  employeeCount: number;
};

type TrendPoint = {
  label: string;
  value: number;
};

type MetricsSummary = {
  revenue: TrendPoint[];
  expense: TrendPoint[];
  profit: TrendPoint[];
  customers: TrendPoint[];
  employees: TrendPoint[];
};

type MetricDraft = {
  reportingMonth: string;
  revenue: string;
  expense: string;
  profit: string;
  customerCount: string;
  employeeCount: string;
};

const PROFILE_QUERY_KEY = ["business", "profile"] as const;
const METRICS_QUERY_KEY = ["business", "metrics"] as const;
const SUMMARY_QUERY_KEY = ["business", "metrics", "summary"] as const;

const DEFAULT_PROFILE: BusinessProfile = {
  id: null,
  businessName: "",
  ownerName: "",
  industry: "",
  city: "",
  state: "",
  country: "",
  monthlyRevenue: "",
  monthlyExpense: "",
  employeeCount: "",
  customerCount: "",
  website: "",
  growthGoal: "",
};

const DEFAULT_METRIC_DRAFT: MetricDraft = {
  reportingMonth: "",
  revenue: "",
  expense: "",
  profit: "",
  customerCount: "",
  employeeCount: "",
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function unwrapPayload<T>(value: unknown): T {
  const root = asRecord(value);
  const nested = asRecord(root.data);
  if (nested && "data" in nested) {
    return nested.data as T;
  }
  if ("data" in root) {
    return root.data as T;
  }
  return value as T;
}

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toMonthValue(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/^(\d{4})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}`;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatMonth(month: string): string {
  if (!month) return "—";
  const [year, monthPart] = month.split("-");
  const date = new Date(Number(year), Number(monthPart) - 1, 1);
  if (Number.isNaN(date.getTime())) return month;
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
    notation: Math.abs(value) >= 100000 ? "compact" : "standard",
  }).format(value);
}

function parseProfile(raw: unknown): BusinessProfile {
  const record = asRecord(raw);
  return {
    id: (record.id as string | number | undefined) ?? (record.profile_id as string | number | undefined) ?? null,
    businessName: String(record.business_name ?? record.businessName ?? record.name ?? "").trim(),
    ownerName: String(record.owner_name ?? record.ownerName ?? "").trim(),
    industry: String(record.industry ?? "").trim(),
    city: String(record.city ?? "").trim(),
    state: String(record.state ?? "").trim(),
    country: String(record.country ?? "").trim(),
    monthlyRevenue: String(record.monthly_revenue ?? record.monthlyRevenue ?? "").trim(),
    monthlyExpense: String(record.monthly_expense ?? record.monthlyExpense ?? "").trim(),
    employeeCount: String(record.employee_count ?? record.employeeCount ?? "").trim(),
    customerCount: String(record.customer_count ?? record.customerCount ?? "").trim(),
    website: String(record.website ?? "").trim(),
    growthGoal: String(record.growth_goal ?? record.growthGoal ?? record.goal ?? "").trim(),
  };
}

function parseMetric(raw: unknown): MetricEntry | null {
  const record = asRecord(raw);
  const id = (record.id as string | number | undefined) ?? (record.metric_id as string | number | undefined);
  if (id === undefined || id === null) return null;

  return {
    id,
    reportingMonth: toMonthValue(record.reporting_month ?? record.reportingMonth ?? record.month),
    revenue: toNumber(record.revenue),
    expense: toNumber(record.expense),
    profit: toNumber(record.profit),
    customerCount: toNumber(record.customer_count ?? record.customerCount),
    employeeCount: toNumber(record.employee_count ?? record.employeeCount),
  };
}

function parseTrendCollection(raw: unknown): TrendPoint[] {
  if (Array.isArray(raw)) {
    return raw
      .map((entry) => {
        const record = asRecord(entry);
        const label = toMonthValue(record.reporting_month ?? record.reportingMonth ?? record.month ?? record.label);
        const value = toNumber(record.value ?? record.amount ?? record.total ?? record.count);
        if (!label) return null;
        return { label, value };
      })
      .filter((entry): entry is TrendPoint => Boolean(entry))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  const record = asRecord(raw);
  const entries = Object.entries(record)
    .map(([key, value]) => {
      const label = toMonthValue(key);
      if (!label) return null;
      return { label, value: toNumber(value) };
    })
    .filter((entry): entry is TrendPoint => Boolean(entry))
    .sort((a, b) => a.label.localeCompare(b.label));

  return entries;
}

function parseSummary(raw: unknown): MetricsSummary {
  const record = asRecord(raw);
  const rows = Array.isArray(record.rows) ? record.rows : Array.isArray(record.items) ? record.items : [];
  const pickTrend = (primary: TrendPoint[], fallback: TrendPoint[]) => (primary.length > 0 ? primary : fallback);

  const inferredFromRows = {
    revenue: rows
      .map((row) => {
        const recordRow = asRecord(row);
        const label = toMonthValue(recordRow.reporting_month ?? recordRow.reportingMonth ?? recordRow.month);
        if (!label) return null;
        return { label, value: toNumber(recordRow.revenue) };
      })
      .filter((entry): entry is TrendPoint => Boolean(entry)),
    expense: rows
      .map((row) => {
        const recordRow = asRecord(row);
        const label = toMonthValue(recordRow.reporting_month ?? recordRow.reportingMonth ?? recordRow.month);
        if (!label) return null;
        return { label, value: toNumber(recordRow.expense) };
      })
      .filter((entry): entry is TrendPoint => Boolean(entry)),
    profit: rows
      .map((row) => {
        const recordRow = asRecord(row);
        const label = toMonthValue(recordRow.reporting_month ?? recordRow.reportingMonth ?? recordRow.month);
        if (!label) return null;
        return { label, value: toNumber(recordRow.profit) };
      })
      .filter((entry): entry is TrendPoint => Boolean(entry)),
    customers: rows
      .map((row) => {
        const recordRow = asRecord(row);
        const label = toMonthValue(recordRow.reporting_month ?? recordRow.reportingMonth ?? recordRow.month);
        if (!label) return null;
        return { label, value: toNumber(recordRow.customer_count ?? recordRow.customerCount) };
      })
      .filter((entry): entry is TrendPoint => Boolean(entry)),
    employees: rows
      .map((row) => {
        const recordRow = asRecord(row);
        const label = toMonthValue(recordRow.reporting_month ?? recordRow.reportingMonth ?? recordRow.month);
        if (!label) return null;
        return { label, value: toNumber(recordRow.employee_count ?? recordRow.employeeCount) };
      })
      .filter((entry): entry is TrendPoint => Boolean(entry)),
  };

  return {
    revenue: pickTrend(
      parseTrendCollection(record.revenue_trend ?? record.revenueTrend ?? record.revenue),
      inferredFromRows.revenue
    ),
    expense: pickTrend(
      parseTrendCollection(record.expense_trend ?? record.expenseTrend ?? record.expense),
      inferredFromRows.expense
    ),
    profit: pickTrend(
      parseTrendCollection(record.profit_trend ?? record.profitTrend ?? record.profit),
      inferredFromRows.profit
    ),
    customers: pickTrend(
      parseTrendCollection(record.customer_trend ?? record.customerTrend ?? record.customers),
      inferredFromRows.customers
    ),
    employees: pickTrend(
      parseTrendCollection(record.employee_trend ?? record.employeeTrend ?? record.employees),
      inferredFromRows.employees
    ),
  };
}

async function fetchBusinessProfile(signal?: AbortSignal): Promise<BusinessProfile | null> {
  try {
    const response = await fetcher<unknown>("/business/profile", { signal, raw: true, cache: "no-store" });
    const parsed = parseProfile(unwrapPayload<unknown>(response));
    if (
      !parsed.id &&
      !parsed.businessName &&
      !parsed.ownerName &&
      !parsed.industry &&
      !parsed.city &&
      !parsed.state &&
      !parsed.country &&
      !parsed.monthlyRevenue &&
      !parsed.monthlyExpense &&
      !parsed.employeeCount &&
      !parsed.customerCount &&
      !parsed.website &&
      !parsed.growthGoal
    ) {
      return null;
    }
    return parsed;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

async function createBusinessProfile(payload: BusinessProfile): Promise<BusinessProfile> {
  const body = {
    business_name: payload.businessName,
    owner_name: payload.ownerName,
    industry: payload.industry,
    city: payload.city,
    state: payload.state,
    country: payload.country,
    monthly_revenue: toNumber(payload.monthlyRevenue),
    monthly_expense: toNumber(payload.monthlyExpense),
    employee_count: toNumber(payload.employeeCount),
    customer_count: toNumber(payload.customerCount),
    website: payload.website.trim(),
    growth_goal: payload.growthGoal,
  };
  const response = await fetcher<unknown>("/business/profile", {
    method: "POST",
    body,
    raw: true,
    cache: "no-store",
  });
  return parseProfile(unwrapPayload<unknown>(response));
}

async function updateBusinessProfile(payload: BusinessProfile): Promise<BusinessProfile> {
  const body = {
    business_name: payload.businessName,
    owner_name: payload.ownerName,
    industry: payload.industry,
    city: payload.city,
    state: payload.state,
    country: payload.country,
    monthly_revenue: toNumber(payload.monthlyRevenue),
    monthly_expense: toNumber(payload.monthlyExpense),
    employee_count: toNumber(payload.employeeCount),
    customer_count: toNumber(payload.customerCount),
    website: payload.website.trim(),
    growth_goal: payload.growthGoal,
  };
  const response = await fetcher<unknown>("/business/profile", {
    method: "PUT",
    body,
    raw: true,
    cache: "no-store",
  });
  return parseProfile(unwrapPayload<unknown>(response));
}

async function fetchBusinessMetrics(signal?: AbortSignal): Promise<MetricEntry[]> {
  const response = await fetcher<unknown>("/business/metrics", { signal, raw: true, cache: "no-store" });
  const payload = unwrapPayload<unknown>(response);
  const list = Array.isArray(payload) ? payload : [];
  return list
    .map((entry) => parseMetric(entry))
    .filter((entry): entry is MetricEntry => Boolean(entry))
    .sort((a, b) => b.reportingMonth.localeCompare(a.reportingMonth));
}

function buildMetricBody(draft: MetricDraft) {
  return {
    reporting_month: draft.reportingMonth,
    revenue: toNumber(draft.revenue),
    expense: toNumber(draft.expense),
    profit: toNumber(draft.profit),
    customer_count: toNumber(draft.customerCount),
    employee_count: toNumber(draft.employeeCount),
  };
}

async function createBusinessMetric(draft: MetricDraft): Promise<MetricEntry> {
  const response = await fetcher<unknown>("/business/metrics", {
    method: "POST",
    body: buildMetricBody(draft),
    raw: true,
    cache: "no-store",
  });
  const metric = parseMetric(unwrapPayload<unknown>(response));
  if (!metric) {
    throw new Error("Unable to parse created metric");
  }
  return metric;
}

async function updateBusinessMetric(id: string | number, draft: MetricDraft): Promise<MetricEntry> {
  const response = await fetcher<unknown>(`/business/metrics/${encodeURIComponent(String(id))}`, {
    method: "PUT",
    body: buildMetricBody(draft),
    raw: true,
    cache: "no-store",
  });
  const metric = parseMetric(unwrapPayload<unknown>(response));
  if (!metric) {
    throw new Error("Unable to parse updated metric");
  }
  return metric;
}

async function deleteBusinessMetric(id: string | number): Promise<void> {
  await fetcher<void>(`/business/metrics/${encodeURIComponent(String(id))}`, {
    method: "DELETE",
    cache: "no-store",
  });
}

async function fetchMetricsSummary(signal?: AbortSignal): Promise<MetricsSummary> {
  const response = await fetcher<unknown>("/business/metrics/summary", { signal, raw: true, cache: "no-store" });
  return parseSummary(unwrapPayload<unknown>(response));
}

function FormField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block space-y-2 ${className}`}>
      <span className="text-xs font-medium text-slate-300">{label}</span>
      {children}
    </label>
  );
}

function TrendTile({
  label,
  points,
  formatter,
}: {
  label: string;
  points: TrendPoint[];
  formatter: (value: number) => string;
}) {
  const latest = points[points.length - 1];
  const previous = points[points.length - 2];
  const delta = latest && previous ? latest.value - previous.value : null;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{latest ? formatter(latest.value) : "—"}</p>
      <div className="mt-1 flex items-center gap-2 text-xs">
        <span className="text-slate-400">{latest ? formatMonth(latest.label) : "No data"}</span>
        {delta !== null ? (
          <span className={delta >= 0 ? "text-emerald-300" : "text-rose-300"}>
            {delta >= 0 ? "+" : ""}
            {formatter(delta)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function profileMutationError(error: unknown): string {
  if (!(error instanceof ApiError)) return toErrorMessage(error);
  const details = error.details;
  if (!details) return toErrorMessage(error);

  const messages = Array.isArray(details)
    ? details
        .map((entry) => {
          const record = asRecord(entry);
          if (typeof record.msg === "string" && record.msg.trim()) return record.msg.trim();
          if (typeof record.message === "string" && record.message.trim()) return record.message.trim();
          return null;
        })
        .filter((message): message is string => Boolean(message))
    : Object.values(asRecord(details))
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean);

  if (messages.length > 0) return messages.join(" · ");
  return toErrorMessage(error);
}

export function BusinessConnectWorkspace() {
  const queryClient = useQueryClient();
  const [profileDraft, setProfileDraft] = useState<BusinessProfile>(DEFAULT_PROFILE);
  const [metricDraft, setMetricDraft] = useState<MetricDraft>(DEFAULT_METRIC_DRAFT);
  const [editingMetricId, setEditingMetricId] = useState<string | number | null>(null);

  const profileQuery = useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: ({ signal }) => fetchBusinessProfile(signal),
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
  });

  const metricsQuery = useQuery({
    queryKey: METRICS_QUERY_KEY,
    queryFn: ({ signal }) => fetchBusinessMetrics(signal),
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false,
  });

  const summaryQuery = useQuery({
    queryKey: SUMMARY_QUERY_KEY,
    queryFn: ({ signal }) => fetchMetricsSummary(signal),
    enabled: (metricsQuery.data?.length ?? 0) > 0,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (profileQuery.data) {
      setProfileDraft(profileQuery.data);
    } else {
      setProfileDraft(DEFAULT_PROFILE);
    }
  }, [profileQuery.data]);

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      if (profileQuery.data !== null) {
        return updateBusinessProfile(profileDraft);
      }
      return createBusinessProfile(profileDraft);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
  });

  const saveMetricMutation = useMutation({
    mutationFn: async () => {
      if (editingMetricId !== null) {
        return updateBusinessMetric(editingMetricId, metricDraft);
      }
      return createBusinessMetric(metricDraft);
    },
    onSuccess: () => {
      setMetricDraft(DEFAULT_METRIC_DRAFT);
      setEditingMetricId(null);
      void queryClient.invalidateQueries({ queryKey: METRICS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: SUMMARY_QUERY_KEY });
    },
  });

  const deleteMetricMutation = useMutation({
    mutationFn: (id: string | number) => deleteBusinessMetric(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: METRICS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: SUMMARY_QUERY_KEY });
    },
  });

  const profileError = profileQuery.error ? toErrorMessage(profileQuery.error) : null;
  const metricsError = metricsQuery.error ? toErrorMessage(metricsQuery.error) : null;
  const summaryError = summaryQuery.error ? toErrorMessage(summaryQuery.error) : null;
  const profileExists = Boolean(profileQuery.data);
  const hasMetrics = (metricsQuery.data?.length ?? 0) > 0;

  const summary = useMemo<MetricsSummary>(() => {
    return (
      summaryQuery.data ?? {
        revenue: [],
        expense: [],
        profit: [],
        customers: [],
        employees: [],
      }
    );
  }, [summaryQuery.data]);

  const isMetricDraftValid =
    Boolean(metricDraft.reportingMonth) &&
    metricDraft.revenue.trim() !== "" &&
    metricDraft.expense.trim() !== "" &&
    metricDraft.profit.trim() !== "" &&
    metricDraft.customerCount.trim() !== "" &&
    metricDraft.employeeCount.trim() !== "";

  return (
    <div className="space-y-5 animate-fade-in">
      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader
          eyebrow="Business Connect"
          title="Business profile and metrics"
          subtitle="Connected to live backend Business Profile and Business Metrics APIs."
          action={
            profileExists ? (
              <StatusPill label="Profile active" tone="success" />
            ) : (
              <StatusPill label="Profile setup" tone="warn" />
            )
          }
        />
        {profileError ? <p className="mt-3 text-sm text-rose-300">{profileError}</p> : null}
      </SurfaceCard>

      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader
          eyebrow="Business Profile"
          title={profileExists ? "Update business profile" : "Set up your business profile"}
          subtitle={
            profileExists
              ? "Keep business details up to date for Business Connect."
              : "No profile found. Complete onboarding to start tracking business metrics."
          }
        />
        <form
          className="mt-4 grid gap-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            void saveProfileMutation.mutateAsync();
          }}
        >
          <FormField label="Business Name">
            <input
              value={profileDraft.businessName}
              onChange={(event) =>
                setProfileDraft((current) => ({
                  ...current,
                  businessName: event.target.value,
                }))
              }
              className="v2-input w-full"
              placeholder="Enter business name"
              required
            />
          </FormField>

          <FormField label="Owner Name">
            <input
              value={profileDraft.ownerName}
              onChange={(event) =>
                setProfileDraft((current) => ({
                  ...current,
                  ownerName: event.target.value,
                }))
              }
              className="v2-input w-full"
              placeholder="Enter owner name"
              required
            />
          </FormField>

          <FormField label="Industry">
            <input
              value={profileDraft.industry}
              onChange={(event) =>
                setProfileDraft((current) => ({
                  ...current,
                  industry: event.target.value,
                }))
              }
              className="v2-input w-full"
              placeholder="e.g. Real Estate"
              required
            />
          </FormField>

          <FormField label="City">
            <input
              value={profileDraft.city}
              onChange={(event) =>
                setProfileDraft((current) => ({
                  ...current,
                  city: event.target.value,
                }))
              }
              className="v2-input w-full"
              placeholder="Enter city"
              required
            />
          </FormField>

          <FormField label="State">
            <input
              value={profileDraft.state}
              onChange={(event) =>
                setProfileDraft((current) => ({
                  ...current,
                  state: event.target.value,
                }))
              }
              className="v2-input w-full"
              placeholder="Enter state"
              required
            />
          </FormField>

          <FormField label="Country">
            <input
              value={profileDraft.country}
              onChange={(event) =>
                setProfileDraft((current) => ({
                  ...current,
                  country: event.target.value,
                }))
              }
              className="v2-input w-full"
              placeholder="Enter country"
              required
            />
          </FormField>

          <FormField label="Monthly Revenue">
            <input
              type="number"
              min="0"
              value={profileDraft.monthlyRevenue}
              onChange={(event) =>
                setProfileDraft((current) => ({
                  ...current,
                  monthlyRevenue: event.target.value,
                }))
              }
              className="v2-input w-full"
              required
            />
          </FormField>

          <FormField label="Monthly Expense">
            <input
              type="number"
              min="0"
              value={profileDraft.monthlyExpense}
              onChange={(event) =>
                setProfileDraft((current) => ({
                  ...current,
                  monthlyExpense: event.target.value,
                }))
              }
              className="v2-input w-full"
              required
            />
          </FormField>

          <FormField label="Employee Count">
            <input
              type="number"
              min="0"
              value={profileDraft.employeeCount}
              onChange={(event) =>
                setProfileDraft((current) => ({
                  ...current,
                  employeeCount: event.target.value,
                }))
              }
              className="v2-input w-full"
              required
            />
          </FormField>

          <FormField label="Customer Count">
            <input
              type="number"
              min="0"
              value={profileDraft.customerCount}
              onChange={(event) =>
                setProfileDraft((current) => ({
                  ...current,
                  customerCount: event.target.value,
                }))
              }
              className="v2-input w-full"
              required
            />
          </FormField>

          <FormField label="Website (optional)" className="sm:col-span-2">
            <input
              type="url"
              value={profileDraft.website}
              onChange={(event) =>
                setProfileDraft((current) => ({
                  ...current,
                  website: event.target.value,
                }))
              }
              className="v2-input w-full"
              placeholder="https://example.com"
            />
          </FormField>

          <FormField label="Growth Goal" className="sm:col-span-2">
            <textarea
              value={profileDraft.growthGoal}
              onChange={(event) =>
                setProfileDraft((current) => ({
                  ...current,
                  growthGoal: event.target.value,
                }))
              }
              className="min-h-28 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500"
              placeholder="Describe the current business growth objective"
            />
          </FormField>

          <div className="sm:col-span-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={saveProfileMutation.isPending}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saveProfileMutation.isPending ? "Saving..." : profileExists ? "Update Profile" : "Create Profile"}
            </button>
            {saveProfileMutation.error ? (
              <p className="text-xs text-rose-300">{profileMutationError(saveProfileMutation.error)}</p>
            ) : null}
            {saveProfileMutation.isSuccess ? <p className="text-xs text-emerald-300">Profile saved.</p> : null}
          </div>
        </form>
      </SurfaceCard>

      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <SurfaceCard className="p-4 sm:p-5">
          <SectionHeader
            eyebrow="Business Metrics"
            title={editingMetricId !== null ? "Edit metric entry" : "Add metric entry"}
            subtitle="Track monthly revenue, expense, profit, customers, and employees."
          />
          <form
            className="mt-4 grid gap-4 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!isMetricDraftValid) return;
              void saveMetricMutation.mutateAsync();
            }}
          >
            <FormField label="Reporting Month">
              <input
                type="month"
                value={metricDraft.reportingMonth}
                onChange={(event) =>
                  setMetricDraft((current) => ({
                    ...current,
                    reportingMonth: event.target.value,
                  }))
                }
                className="v2-input w-full"
                required
              />
            </FormField>

            <FormField label="Revenue">
              <input
                type="number"
                min="0"
                value={metricDraft.revenue}
                onChange={(event) =>
                  setMetricDraft((current) => ({
                    ...current,
                    revenue: event.target.value,
                  }))
                }
                className="v2-input w-full"
                required
              />
            </FormField>

            <FormField label="Expense">
              <input
                type="number"
                min="0"
                value={metricDraft.expense}
                onChange={(event) =>
                  setMetricDraft((current) => ({
                    ...current,
                    expense: event.target.value,
                  }))
                }
                className="v2-input w-full"
                required
              />
            </FormField>

            <FormField label="Profit">
              <input
                type="number"
                value={metricDraft.profit}
                onChange={(event) =>
                  setMetricDraft((current) => ({
                    ...current,
                    profit: event.target.value,
                  }))
                }
                className="v2-input w-full"
                required
              />
            </FormField>

            <FormField label="Customer Count">
              <input
                type="number"
                min="0"
                value={metricDraft.customerCount}
                onChange={(event) =>
                  setMetricDraft((current) => ({
                    ...current,
                    customerCount: event.target.value,
                  }))
                }
                className="v2-input w-full"
                required
              />
            </FormField>

            <FormField label="Employee Count">
              <input
                type="number"
                min="0"
                value={metricDraft.employeeCount}
                onChange={(event) =>
                  setMetricDraft((current) => ({
                    ...current,
                    employeeCount: event.target.value,
                  }))
                }
                className="v2-input w-full"
                required
              />
            </FormField>

            <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={saveMetricMutation.isPending || !isMetricDraftValid}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {saveMetricMutation.isPending ? "Saving..." : editingMetricId !== null ? "Update Metric" : "Create Metric"}
              </button>
              {editingMetricId !== null ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingMetricId(null);
                    setMetricDraft(DEFAULT_METRIC_DRAFT);
                  }}
                  className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
                >
                  Cancel Edit
                </button>
              ) : null}
              {saveMetricMutation.error ? (
                <p className="text-xs text-rose-300">{toErrorMessage(saveMetricMutation.error)}</p>
              ) : null}
              {saveMetricMutation.isSuccess ? <p className="text-xs text-emerald-300">Metric saved.</p> : null}
            </div>
          </form>
        </SurfaceCard>

        <SurfaceCard className="p-4 sm:p-5">
          <SectionHeader
            eyebrow="Metrics History"
            title="Business metrics records"
            subtitle="Create, edit, and delete monthly entries."
          />
          {metricsError ? <p className="mt-3 text-sm text-rose-300">{metricsError}</p> : null}
          {!hasMetrics && !metricsQuery.isPending ? (
            <div className="mt-4">
              <EmptyBlock
                title="No metrics yet"
                message="Add your first metric entry to start building trend history."
              />
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-[0.12em] text-slate-500">
                    <th className="px-2 py-2">Month</th>
                    <th className="px-2 py-2">Revenue</th>
                    <th className="px-2 py-2">Expense</th>
                    <th className="px-2 py-2">Profit</th>
                    <th className="px-2 py-2">Customers</th>
                    <th className="px-2 py-2">Employees</th>
                    <th className="px-2 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(metricsQuery.data ?? []).map((metric) => (
                    <tr key={String(metric.id)} className="border-b border-white/5 text-slate-200">
                      <td className="px-2 py-3">{formatMonth(metric.reportingMonth)}</td>
                      <td className="px-2 py-3">{formatCurrency(metric.revenue)}</td>
                      <td className="px-2 py-3">{formatCurrency(metric.expense)}</td>
                      <td className="px-2 py-3">{formatCurrency(metric.profit)}</td>
                      <td className="px-2 py-3">{metric.customerCount.toLocaleString("en-IN")}</td>
                      <td className="px-2 py-3">{metric.employeeCount.toLocaleString("en-IN")}</td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMetricId(metric.id);
                              setMetricDraft({
                                reportingMonth: metric.reportingMonth,
                                revenue: String(metric.revenue),
                                expense: String(metric.expense),
                                profit: String(metric.profit),
                                customerCount: String(metric.customerCount),
                                employeeCount: String(metric.employeeCount),
                              });
                            }}
                            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-white/10"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              void deleteMetricMutation.mutateAsync(metric.id);
                            }}
                            disabled={deleteMetricMutation.isPending}
                            className="rounded-lg border border-rose-400/20 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SurfaceCard>
      </div>

      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader
          eyebrow="Business Dashboard"
          title="Operational trends"
          subtitle="Revenue, expense, profit, customer, and employee trends from metrics summary."
        />
        {summaryError ? <p className="mt-3 text-sm text-rose-300">{summaryError}</p> : null}
        {!hasMetrics ? (
          <div className="mt-4">
            <EmptyBlock
              title="Dashboard is empty"
              message="Add your first metric entry to populate trend cards on this dashboard."
            />
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <TrendTile label="Revenue Trend" points={summary.revenue} formatter={(value) => formatCurrency(value)} />
            <TrendTile label="Expense Trend" points={summary.expense} formatter={(value) => formatCurrency(value)} />
            <TrendTile label="Profit Trend" points={summary.profit} formatter={(value) => formatCurrency(value)} />
            <TrendTile
              label="Customer Trend"
              points={summary.customers}
              formatter={(value) => Math.round(value).toLocaleString("en-IN")}
            />
            <TrendTile
              label="Employee Trend"
              points={summary.employees}
              formatter={(value) => Math.round(value).toLocaleString("en-IN")}
            />
          </div>
        )}
      </SurfaceCard>
    </div>
  );
}
