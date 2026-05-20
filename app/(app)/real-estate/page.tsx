"use client";

import Link from "next/link";
import {
  EmptyBlock,
  ExposureBar,
  IntelligenceCard,
  LoadingBlock,
  SectionHeader,
  StatusPill,
  SurfaceCard,
  type IntelTone,
} from "@/components/v2/ui";
import { useOperatingSystemData } from "@/lib/hooks/useOperatingSystem";
import type { Asset } from "@/lib/types/assets";

type Tone = "info" | "success" | "warn" | "danger";
type CollectionState = "clear" | "due-soon" | "overdue" | "vacant";

interface PropertyRow {
  property: Asset;
  name: string;
  location: string;
  city: string;
  assetType: string;
  occupied: boolean;
  occupancyLabel: string;
  occupancyTone: Tone;
  monthlyRent: number;
  currentValue: number;
  yieldPct: number;
  dueDays: number | null;
  dueDate: string | null;
  leaseLabel: string;
  leaseTone: Tone;
  tenantStatusLabel: string;
  tenantTone: Tone;
  riskLabel: string;
  riskTone: Tone;
  cashflowLabel: string;
  cashflowTone: Tone;
  collectionState: CollectionState;
  docsGap: boolean;
}

function money(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function compactMoney(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function pct(value: number, digits = 1) {
  return `${value.toFixed(digits)}%`;
}

function formatDate(value: string | null) {
  if (!value) return "Not synced";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not synced";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function formatDueLabel(days: number | null) {
  if (days === null) return "No sync";
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Today";
  return `${days}d`;
}

function getDaysUntil(value: string | null) {
  if (!value) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getCity(location: string | null) {
  if (!location) return "Unassigned";
  const [primary] = location.split(",").map((part) => part.trim()).filter(Boolean);
  return primary || location;
}

function inferAssetType(property: Asset) {
  const source = `${property.name} ${property.location ?? ""} ${(property.tags ?? []).join(" ")}`.toLowerCase();
  if (/(office|retail|tower|commercial|warehouse|business|plaza)/.test(source)) return "Commercial";
  if (/(villa|residential|residence|apartment|flat|home|condo)/.test(source)) return "Residential";
  if (/(hotel|resort|hospitality|stay)/.test(source)) return "Hospitality";
  if (/(plot|land|site)/.test(source)) return "Land";
  return "Core Asset";
}

function getDonutGradient(items: Array<{ value: number; color: string }>) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (total <= 0) return "conic-gradient(#1e293b 0deg 360deg)";

  let current = 0;
  const segments: string[] = [];
  items.forEach((item) => {
    if (item.value <= 0) return;
    const sweep = (item.value / total) * 360;
    segments.push(`${item.color} ${current}deg ${current + sweep}deg`);
    current += sweep;
  });
  return `conic-gradient(${segments.join(", ")})`;
}

function getCollectionState(property: Asset, dueDays: number | null): CollectionState {
  if (!property.tenant_name) return "vacant";
  if (dueDays !== null && dueDays < 0 && !property.rent_received) return "overdue";
  if (dueDays !== null && dueDays <= 14 && !property.rent_received) return "due-soon";
  return "clear";
}

function StatCard({
  label,
  value,
  trend,
  detail,
  tone = "info",
}: {
  label: string;
  value: string;
  trend: string;
  detail: string;
  tone?: Tone;
}) {
  const accent = {
    info: "border-sky-400/20 bg-sky-500/[0.03]",
    success: "border-emerald-400/20 bg-emerald-500/[0.03]",
    warn: "border-amber-400/20 bg-amber-500/[0.03]",
    danger: "border-rose-400/20 bg-rose-500/[0.04]",
  }[tone];
  const trendColor = {
    info: "text-sky-300",
    success: "text-emerald-300",
    warn: "text-amber-300",
    danger: "text-rose-300",
  }[tone];

  return (
    <div className={`rounded-xl border p-3 ${accent}`}>
      <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold tracking-tight text-white">{value}</p>
      <p className={`mt-1 text-xs font-medium ${trendColor}`}>{trend}</p>
      <p className="mt-1 text-[11px] text-slate-500">{detail}</p>
    </div>
  );
}

export default function RealEstatePage() {
  const { data, isLoading, isError } = useOperatingSystemData();

  if (isLoading) return <LoadingBlock label="Loading real estate operations..." />;
  if (isError) {
    return (
      <EmptyBlock
        title="Real estate operations unavailable"
        message="Please retry once property intelligence connectivity is restored."
      />
    );
  }

  const properties = data.realEstate.properties;

  if (properties.length === 0) {
    return (
      <div className="space-y-5">
        <SurfaceCard className="p-5 sm:p-6">
          <SectionHeader
            eyebrow="Real Estate Operations"
            title="Property operations command center"
            subtitle="Occupancy intelligence, lease monitoring, rent collection and asset performance."
            action={<Link href="/assets/new" className="v2-action">+ Add Property</Link>}
          />
        </SurfaceCard>
        <EmptyBlock
          title="No property records found"
          message="Add a property to activate rent intelligence, lease timeline monitoring and portfolio operations workflows."
        />
      </div>
    );
  }

  const portfolioYield = data.realEstate.rentalYieldPct;

  const rows = properties
    .map<PropertyRow>((property) => {
      const currentValue = Number(property.current_value ?? property.value ?? property.purchase_price ?? 0);
      const monthlyRent = Number(property.rent_amount ?? 0);
      const dueDays = getDaysUntil(property.rent_due_date);
      const collectionState = getCollectionState(property, dueDays);
      const occupied = Boolean(property.tenant_name);
      const yieldPct = currentValue > 0 && monthlyRent > 0 ? (monthlyRent * 12 * 100) / currentValue : 0;
      const docsGap = occupied && (!property.tenant_email || !property.tenant_phone);

      let leaseLabel = "Not synced";
      let leaseTone: Tone = "info";
      if (dueDays !== null) {
        if (dueDays < 0) {
          leaseLabel = `Expired ${Math.abs(dueDays)}d`;
          leaseTone = "danger";
        } else if (dueDays <= 30) {
          leaseLabel = `Due in ${dueDays}d`;
          leaseTone = "warn";
        } else if (dueDays <= 75) {
          leaseLabel = `${dueDays}d runway`;
          leaseTone = "info";
        } else {
          leaseLabel = "Long dated";
          leaseTone = "success";
        }
      }

      let riskLabel = "Stable";
      let riskTone: Tone = "success";
      if (collectionState === "overdue" || !occupied) {
        riskLabel = collectionState === "overdue" ? "Collection Risk" : "Vacancy Risk";
        riskTone = collectionState === "overdue" ? "danger" : "warn";
      } else if (docsGap || collectionState === "due-soon" || yieldPct < Math.max(portfolioYield - 0.5, 4)) {
        riskLabel = "Watch";
        riskTone = "warn";
      }

      let cashflowLabel = "Stable";
      let cashflowTone: Tone = "info";
      if (!occupied) {
        cashflowLabel = "Leakage";
        cashflowTone = "warn";
      } else if (collectionState === "overdue") {
        cashflowLabel = "At Risk";
        cashflowTone = "danger";
      } else if (yieldPct >= Math.max(portfolioYield, 5.5)) {
        cashflowLabel = "Outperforming";
        cashflowTone = "success";
      }

      let tenantStatusLabel = "Vacant";
      let tenantTone: Tone = "warn";
      if (occupied && collectionState === "overdue") {
        tenantStatusLabel = "Delayed";
        tenantTone = "danger";
      } else if (occupied && collectionState === "due-soon") {
        tenantStatusLabel = "Due Soon";
        tenantTone = "warn";
      } else if (occupied) {
        tenantStatusLabel = "Active";
        tenantTone = "success";
      }

      return {
        property,
        name: property.name || "Unnamed property",
        location: property.location ?? "Location pending",
        city: getCity(property.location),
        assetType: inferAssetType(property),
        occupied,
        occupancyLabel: occupied ? "Occupied" : "Vacant",
        occupancyTone: occupied ? "success" : "warn",
        monthlyRent,
        currentValue,
        yieldPct,
        dueDays,
        dueDate: property.rent_due_date,
        leaseLabel,
        leaseTone,
        tenantStatusLabel,
        tenantTone,
        riskLabel,
        riskTone,
        cashflowLabel,
        cashflowTone,
        collectionState,
        docsGap,
      };
    })
    .sort((left, right) => {
      const priority = { overdue: 0, vacant: 1, "due-soon": 2, clear: 3 };
      const diff = priority[left.collectionState] - priority[right.collectionState];
      if (diff !== 0) return diff;
      return right.monthlyRent - left.monthlyRent;
    });

  const totalValue = data.realEstate.totalValue || rows.reduce((sum, row) => sum + row.currentValue, 0);
  const potentialRent = rows.reduce((sum, row) => sum + row.monthlyRent, 0);
  const monthlyRent = data.realEstate.monthlyRent || rows.filter((row) => row.occupied).reduce((sum, row) => sum + row.monthlyRent, 0);
  const occupiedCount = data.realEstate.occupied || rows.filter((row) => row.occupied).length;
  const activeTenants = occupiedCount;
  const occupancyPct = data.realEstate.occupancyPct || (rows.length ? (occupiedCount / rows.length) * 100 : 0);
  const overdueRows = rows.filter((row) => row.collectionState === "overdue");
  const dueSoonRows = rows.filter((row) => row.collectionState === "due-soon");
  const vacantRows = rows.filter((row) => !row.occupied);
  const docsGapRows = rows.filter((row) => row.docsGap);
  const overdueCount = data.realEstate.overdueRent || overdueRows.length;
  const dueThisMonth = rows.filter((row) => {
    if (!row.dueDate) return false;
    const due = new Date(row.dueDate);
    const now = new Date();
    return due.getMonth() === now.getMonth() && due.getFullYear() === now.getFullYear();
  }).length;
  const leaseExpiryCount =
    data.realEstate.leaseExpiry || rows.filter((row) => row.dueDays !== null && row.dueDays >= 0 && row.dueDays <= 60).length;
  const netYield = data.realEstate.rentalYieldPct || (totalValue > 0 ? (monthlyRent * 12 * 100) / totalValue : 0);
  const overdueExposure = overdueRows.reduce((sum, row) => sum + row.monthlyRent, 0);
  const dueSoonExposure = dueSoonRows.reduce((sum, row) => sum + row.monthlyRent, 0);
  const vacancyImpact = vacantRows.reduce((sum, row) => sum + row.monthlyRent, 0);
  const collectionRate = monthlyRent > 0 ? Math.max(0, ((monthlyRent - overdueExposure) / monthlyRent) * 100) : 100;
  const incomeForecast = Math.max(0, potentialRent - vacancyImpact - overdueExposure - dueSoonExposure * 0.35);

  const collectionTone: Tone =
    collectionRate >= 95 ? "success" : collectionRate >= 85 ? "info" : collectionRate >= 70 ? "warn" : "danger";
  const occupancyTone: Tone = occupancyPct >= 92 ? "success" : occupancyPct >= 80 ? "info" : occupancyPct >= 65 ? "warn" : "danger";

  const cityExposure = Array.from(
    rows.reduce((map, row) => {
      map.set(row.city, (map.get(row.city) ?? 0) + row.currentValue);
      return map;
    }, new Map<string, number>())
  )
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value);

  const tenantExposure = Array.from(
    rows.reduce((map, row) => {
      if (!row.property.tenant_name) return map;
      map.set(row.property.tenant_name, (map.get(row.property.tenant_name) ?? 0) + row.monthlyRent);
      return map;
    }, new Map<string, number>())
  )
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value);

  const assetMix = Array.from(
    rows.reduce((map, row) => {
      map.set(row.assetType, (map.get(row.assetType) ?? 0) + row.currentValue);
      return map;
    }, new Map<string, number>())
  )
    .map(([label, value], index) => ({
      label,
      value,
      color: ["#38bdf8", "#8b5cf6", "#10b981", "#f59e0b", "#f472b6"][index % 5],
    }))
    .sort((left, right) => right.value - left.value);

  const incomeContribution = rows
    .filter((row) => row.monthlyRent > 0)
    .map((row) => ({
      label: row.name,
      value: row.monthlyRent,
      share: potentialRent > 0 ? (row.monthlyRent / potentialRent) * 100 : 0,
    }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 5);

  const topPerformer = rows
    .filter((row) => row.monthlyRent > 0)
    .reduce<PropertyRow | null>((best, row) => (!best || row.yieldPct > best.yieldPct ? row : best), null);
  const topCity = cityExposure[0];
  const topTenantShare = tenantExposure.length > 0 && monthlyRent > 0 ? (tenantExposure[0].value / monthlyRent) * 100 : 0;

  const timelineItems = [
    ...overdueRows.map((row) => ({
      id: `overdue-${row.property.id}`,
      title: "Collection escalation",
      property: row.name,
      description: `${money(row.monthlyRent)} pending from ${row.property.tenant_name ?? "tenant"} · ${formatDate(row.dueDate)}`,
      due: row.dueDays ?? 0,
      tone: "danger" as const,
    })),
    ...dueSoonRows.map((row) => ({
      id: `renewal-${row.property.id}`,
      title: "Lease review window",
      property: row.name,
      description: `Milestone due ${formatDate(row.dueDate)} · renewal and rent confirmation pending`,
      due: row.dueDays ?? 0,
      tone: "warn" as const,
    })),
    ...vacantRows.map((row) => ({
      id: `vacant-${row.property.id}`,
      title: "Tenant onboarding",
      property: row.name,
      description: `Vacancy drag ${money(row.monthlyRent)} / month · activate leasing workflow`,
      due: 3,
      tone: "warn" as const,
    })),
    ...docsGapRows.map((row) => ({
      id: `docs-${row.property.id}`,
      title: "Tenant file refresh",
      property: row.name,
      description: "Missing contact data requires document and KYC reconciliation",
      due: 7,
      tone: "info" as const,
    })),
  ]
    .sort((left, right) => left.due - right.due)
    .slice(0, 8);

  const insights: Array<{ title: string; message: string; tone: IntelTone }> = [];

  if (leaseExpiryCount > 0) {
    insights.push({
      title: `${leaseExpiryCount} lease milestones approaching`,
      message: "Renewal and rent review windows are within the next 60 days and need operator attention.",
      tone: leaseExpiryCount >= 3 ? "warn" : "info",
    });
  }
  if (topPerformer) {
    insights.push({
      title: `${topPerformer.name} is outperforming`,
      message: `${pct(topPerformer.yieldPct, 2)} gross yield leads the property run-rate and supports premium cashflow quality.`,
      tone: "success",
    });
  }
  if (topCity && totalValue > 0) {
    const concentration = (topCity.value / totalValue) * 100;
    insights.push({
      title: `${topCity.label} concentration at ${pct(concentration)}`,
      message:
        concentration >= 45
          ? "Geographic concentration is elevated and should be balanced with new-city exposure."
          : "City concentration remains contained across the current property book.",
      tone: concentration >= 45 ? "warn" : "info",
    });
  }
  if (occupancyPct >= 90) {
    insights.push({
      title: "Occupancy is holding premium levels",
      message: "Current occupancy remains stable across income-producing assets with limited vacancy drag.",
      tone: "success",
    });
  }
  if (overdueCount > 0) {
    insights.push({
      title: `${overdueCount} tenant payment behaviors flagged`,
      message: "Delayed collections are reducing current-month realizations and should be escalated from the action queue.",
      tone: overdueCount >= 2 ? "danger" : "warn",
    });
  }

  const actionQueue = [
    ...overdueRows.map((row) => ({
      id: `collect-${row.property.id}`,
      task: "Escalate overdue collection",
      context: `${row.name} · ${money(row.monthlyRent)} outstanding`,
      owner: row.property.tenant_name ?? "Tenant",
      due: formatDueLabel(row.dueDays),
      tone: "danger" as const,
    })),
    ...dueSoonRows.map((row) => ({
      id: `renew-${row.property.id}`,
      task: "Prepare renewal and invoice run",
      context: `${row.name} · ${formatDate(row.dueDate)} milestone`,
      owner: row.property.tenant_name ?? "Leasing",
      due: formatDueLabel(row.dueDays),
      tone: "warn" as const,
    })),
    ...vacantRows.map((row) => ({
      id: `lease-${row.property.id}`,
      task: "Backfill vacant unit",
      context: `${row.name} · vacancy drag ${money(row.monthlyRent)} / month`,
      owner: "Leasing desk",
      due: "3d",
      tone: "warn" as const,
    })),
    ...docsGapRows.map((row) => ({
      id: `kyc-${row.property.id}`,
      task: "Complete tenant documentation",
      context: `${row.name} · missing contact records`,
      owner: row.property.tenant_name ?? "Operations",
      due: "7d",
      tone: "info" as const,
    })),
  ].slice(0, 8);

  const assetMixGradient = getDonutGradient(assetMix);
  const cityGradient = getDonutGradient(
    cityExposure.slice(0, 4).map((item, index) => ({
      value: item.value,
      color: ["#38bdf8", "#8b5cf6", "#10b981", "#f59e0b"][index % 4],
    }))
  );

  const forecastBars = [
    { label: "Secured", value: Math.max(monthlyRent - overdueExposure - dueSoonExposure, 0), color: "#10b981" },
    { label: "Watch", value: dueSoonExposure, color: "#f59e0b" },
    { label: "Overdue", value: overdueExposure, color: "#ef4444" },
    { label: "Vacancy", value: vacancyImpact, color: "#64748b" },
  ];
  const forecastMax = Math.max(...forecastBars.map((item) => item.value), 1);

  return (
    <div className="space-y-5 animate-fade-in">
      <SurfaceCard className="p-4 sm:p-5 lg:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <SectionHeader
            eyebrow="Real Estate Operations"
            title="Property operations command center"
            subtitle="Rental intelligence, occupancy control, lease monitoring and asset performance in one operating layer."
          />
          <div className="flex flex-wrap gap-2">
            <Link href="/assets/new" className="v2-action">+ Add Property</Link>
            <Link href="/assets" className="v2-link">Portfolio assets →</Link>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4 2xl:grid-cols-8">
          <StatCard label="Total Property Value" value={compactMoney(totalValue)} trend={`${rows.length} tracked assets`} detail="Institutional book value" />
          <StatCard label="Monthly Rental Income" value={compactMoney(monthlyRent)} trend={`${compactMoney(incomeForecast)} forecast`} detail="Current contracted collections" tone="success" />
          <StatCard label="Occupancy %" value={pct(occupancyPct)} trend={occupancyPct >= 90 ? "Stable premium occupancy" : "Occupancy under active review"} detail={`${occupiedCount}/${rows.length} occupied`} tone={occupancyTone} />
          <StatCard label="Due This Month" value={String(dueThisMonth)} trend={`${dueSoonRows.length} due soon`} detail="Collection workflow volume" tone={dueThisMonth > 0 ? "info" : "success"} />
          <StatCard label="Overdue Rent" value={String(overdueCount)} trend={overdueCount > 0 ? `${money(overdueExposure)} at risk` : "No escalations"} detail="Collections requiring action" tone={overdueCount > 0 ? "danger" : "success"} />
          <StatCard label="Net Yield" value={pct(netYield, 2)} trend={netYield >= 5.5 ? "Income yield outperforming" : "Yield needs optimisation"} detail="Annualised run-rate" tone={netYield >= 5.5 ? "success" : "warn"} />
          <StatCard label="Active Tenants" value={String(activeTenants)} trend={`${docsGapRows.length} files missing data`} detail="Occupied lease relationships" tone={docsGapRows.length > 0 ? "warn" : "success"} />
          <StatCard label="Lease Expiry Count" value={String(leaseExpiryCount)} trend={leaseExpiryCount > 0 ? "Renewal window live" : "No immediate renewals"} detail="Milestones in 60 days" tone={leaseExpiryCount > 0 ? "warn" : "success"} />
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <div className="v2-tile rounded-xl p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Occupancy trend</p>
              <StatusPill label={occupancyPct >= 90 ? "Stable" : occupancyPct >= 80 ? "Holding" : "Under pressure"} tone={occupancyTone} />
            </div>
            <p className="mt-2 text-sm text-slate-300">Premium occupancy remains {occupancyPct >= 90 ? "intact" : "under review"} across the current property stack.</p>
          </div>
          <div className="v2-tile rounded-xl p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Rent collection health</p>
              <StatusPill label={collectionRate >= 95 ? "Healthy" : collectionRate >= 85 ? "Monitor" : "Escalate"} tone={collectionTone} />
            </div>
            <p className="mt-2 text-sm text-slate-300">{money(overdueExposure)} of contracted rent is sitting in escalation or pre-due review.</p>
          </div>
          <div className="v2-tile rounded-xl p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Collection rate</p>
              <p className="text-lg font-bold text-white">{pct(collectionRate)}</p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full rounded-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400" style={{ width: `${Math.max(0, Math.min(collectionRate, 100))}%` }} />
            </div>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader
          eyebrow="Property Operations Table"
          title="Portfolio operating ledger"
          subtitle="High-density property monitoring for occupancy, collections, lease timing and risk."
        />
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-slate-500">
                {["Property Name", "Location", "Asset Type", "Occupancy Status", "Monthly Rent", "Lease Expiry", "Tenant Status", "Yield %", "Risk Status", "Cashflow Trend"].map((heading) => (
                  <th key={heading} className="border-b border-white/[0.06] px-3 py-3 font-medium first:pl-0 last:pr-0">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const rowClass =
                  row.collectionState === "overdue"
                    ? "bg-rose-500/[0.04]"
                    : row.collectionState === "due-soon"
                    ? "bg-amber-500/[0.03]"
                    : "bg-transparent";

                return (
                  <tr key={row.property.id} className={`${rowClass} text-sm text-slate-200`}>
                    <td className="border-b border-white/[0.05] px-3 py-3 first:pl-0">
                      <div>
                        <p className="font-semibold text-white">{row.name}</p>
                        <p className="mt-1 text-[11px] text-slate-500">{money(row.currentValue)} asset value</p>
                      </div>
                    </td>
                    <td className="border-b border-white/[0.05] px-3 py-3">
                      <div>
                        <p>{row.location}</p>
                        <p className="mt-1 text-[11px] text-slate-500">{row.city} cluster</p>
                      </div>
                    </td>
                    <td className="border-b border-white/[0.05] px-3 py-3">
                      <StatusPill label={row.assetType} tone="info" />
                    </td>
                    <td className="border-b border-white/[0.05] px-3 py-3">
                      <StatusPill label={row.occupancyLabel} tone={row.occupancyTone} />
                    </td>
                    <td className="border-b border-white/[0.05] px-3 py-3 font-medium text-white">{row.monthlyRent > 0 ? money(row.monthlyRent) : "—"}</td>
                    <td className="border-b border-white/[0.05] px-3 py-3">
                      <div className="flex flex-col gap-1">
                        <StatusPill label={row.leaseLabel} tone={row.leaseTone} />
                        <span className="text-[11px] text-slate-500">{formatDate(row.dueDate)}</span>
                      </div>
                    </td>
                    <td className="border-b border-white/[0.05] px-3 py-3">
                      <StatusPill label={row.tenantStatusLabel} tone={row.tenantTone} />
                    </td>
                    <td className="border-b border-white/[0.05] px-3 py-3 font-medium text-white">{row.yieldPct > 0 ? pct(row.yieldPct, 2) : "—"}</td>
                    <td className="border-b border-white/[0.05] px-3 py-3">
                      <StatusPill label={row.riskLabel} tone={row.riskTone} />
                    </td>
                    <td className="border-b border-white/[0.05] px-3 py-3 last:pr-0">
                      <div className="flex flex-col gap-1">
                        <StatusPill label={row.cashflowLabel} tone={row.cashflowTone} />
                        <span className="text-[11px] text-slate-500">
                          {row.collectionState === "overdue"
                            ? "Immediate collection escalation"
                            : row.collectionState === "due-soon"
                            ? "Invoice and renewal review"
                            : row.collectionState === "vacant"
                            ? "Lease-up workflow required"
                            : "Cashflow clear"}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SurfaceCard>

      <div className="grid gap-4 xl:grid-cols-[1.4fr,1fr]">
        <SurfaceCard className="p-4 sm:p-5">
          <SectionHeader
            eyebrow="Rent + Cashflow Intelligence"
            title="Collection and income engine"
            subtitle="Run-rate visibility across secured rent, watchlist exposure, escalations and vacancy drag."
          />
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="v2-tile rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Rent collected vs expected</p>
              <p className="mt-2 text-xl font-bold text-white">{money(Math.max(monthlyRent - overdueExposure, 0))}</p>
              <p className="mt-1 text-xs text-slate-500">Against {money(monthlyRent)} contracted occupied rent</p>
            </div>
            <div className="v2-tile rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Cashflow trend</p>
              <p className="mt-2 text-xl font-bold text-white">{collectionRate >= 92 ? "Stable" : collectionRate >= 80 ? "Softening" : "Under pressure"}</p>
              <p className="mt-1 text-xs text-slate-500">Direction derived from collections and occupancy pressure</p>
            </div>
            <div className="v2-tile rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Overdue escalation</p>
              <p className="mt-2 text-xl font-bold text-white">{money(overdueExposure)}</p>
              <p className="mt-1 text-xs text-slate-500">{overdueCount} collection cases requiring follow-up</p>
            </div>
            <div className="v2-tile rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Vacancy impact</p>
              <p className="mt-2 text-xl font-bold text-white">{money(vacancyImpact)}</p>
              <p className="mt-1 text-xs text-slate-500">{vacantRows.length} vacant assets leaking monthly income</p>
            </div>
            <div className="v2-tile rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Income forecast</p>
              <p className="mt-2 text-xl font-bold text-white">{money(incomeForecast)}</p>
              <p className="mt-1 text-xs text-slate-500">30-day forecast after vacancy and collection drag</p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr,0.85fr]">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-white">Cashflow distribution</p>
                <StatusPill label={collectionRate >= 90 ? "Resilient" : "Needs intervention"} tone={collectionTone} />
              </div>
              <div className="mt-4 grid grid-cols-4 gap-3">
                {forecastBars.map((item) => (
                  <div key={item.label}>
                    <div className="flex h-28 items-end rounded-xl border border-white/[0.06] bg-slate-950/40 p-2">
                      <div className="w-full rounded-md" style={{ height: `${(item.value / forecastMax) * 100}%`, background: item.color }} />
                    </div>
                    <p className="mt-2 text-xs font-medium text-slate-300">{item.label}</p>
                    <p className="text-[11px] text-slate-500">{compactMoney(item.value)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="v2-tile rounded-xl p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Occupancy trend</p>
                  <p className="text-sm font-semibold text-white">{pct(occupancyPct)}</p>
                </div>
                <div className="mt-3 space-y-2">
                  <ExposureBar label="Occupied income base" value={rows.length ? (occupiedCount / rows.length) * 100 : 0} color="#10b981" />
                  <ExposureBar label="Vacancy drag" value={rows.length ? (vacantRows.length / rows.length) * 100 : 0} color="#64748b" />
                  <ExposureBar label="Collection risk" value={rows.length ? ((overdueRows.length + dueSoonRows.length) / rows.length) * 100 : 0} color="#f59e0b" />
                </div>
              </div>
              <div className="v2-tile rounded-xl p-3">
                <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Lease renewal probability</p>
                <p className="mt-2 text-xl font-bold text-white">
                  {leaseExpiryCount === 0 ? "Low" : leaseExpiryCount <= 2 && occupancyPct >= 85 ? "High" : "Moderate"}
                </p>
                <p className="mt-1 text-xs text-slate-500">Based on occupancy stability, payment discipline and near-term milestones</p>
              </div>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard className="p-4 sm:p-5">
          <SectionHeader
            eyebrow="Lease Timeline"
            title="Milestones and expiry watch"
            subtitle="Time-sensitive operational events across the property book."
          />
          <div className="mt-4 space-y-3">
            {timelineItems.length === 0 ? (
              <p className="text-sm text-slate-500">No immediate lease milestones.</p>
            ) : (
              timelineItems.map((item, index) => (
                <div key={item.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className={`mt-1 h-2.5 w-2.5 rounded-full ${item.tone === "danger" ? "bg-rose-400" : item.tone === "warn" ? "bg-amber-400" : "bg-sky-400"}`} />
                    {index !== timelineItems.length - 1 ? <span className="mt-1 h-full w-px bg-white/[0.08]" /> : null}
                  </div>
                  <div className="flex-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">{item.title}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{item.property}</p>
                      </div>
                      <StatusPill label={item.due < 0 ? `${Math.abs(item.due)}d overdue` : `${item.due}d`} tone={item.tone} />
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-500">{item.description}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </SurfaceCard>
      </div>

      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader
          eyebrow="Property Health Engine"
          title="AI-style portfolio signals"
          subtitle="Operator-ready intelligence distilled from occupancy, cashflow and concentration behavior."
        />
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {insights.slice(0, 5).map((insight) => (
            <IntelligenceCard key={insight.title} title={insight.title} message={insight.message} tone={insight.tone} />
          ))}
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader
          eyebrow="Portfolio Analytics"
          title="Institutional real estate analytics"
          subtitle="Geographic concentration, tenant diversification, occupancy distribution and income dependency."
        />

        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Geographic concentration</p>
                <p className="text-xs text-slate-500">Top city exposure by asset value</p>
              </div>
              <div className="h-16 w-16 rounded-full border border-white/[0.08]" style={{ background: cityGradient }} />
            </div>
            <div className="mt-4 space-y-3">
              {cityExposure.slice(0, 4).map((city) => (
                <ExposureBar key={city.label} label={city.label} value={totalValue > 0 ? (city.value / totalValue) * 100 : 0} color="#38bdf8" />
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Asset-class allocation</p>
                <p className="text-xs text-slate-500">Property mix inferred from the current operating stack</p>
              </div>
              <div className="h-16 w-16 rounded-full border border-white/[0.08] p-2" style={{ background: assetMixGradient }}>
                <div className="h-full w-full rounded-full bg-slate-950/90" />
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {assetMix.slice(0, 4).map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                    <span className="text-slate-300">{item.label}</span>
                  </div>
                  <span className="font-semibold text-white">{totalValue > 0 ? pct((item.value / totalValue) * 100) : "0.0%"}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-sm font-semibold text-white">Tenant diversification</p>
            <p className="text-xs text-slate-500">Largest tenant dependency and active tenant spread</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="v2-tile rounded-xl p-3">
                <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500">Active tenants</p>
                <p className="mt-2 text-xl font-bold text-white">{tenantExposure.length}</p>
              </div>
              <div className="v2-tile rounded-xl p-3">
                <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500">Rental dependency</p>
                <p className="mt-2 text-xl font-bold text-white">{pct(topTenantShare)}</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {tenantExposure.slice(0, 4).map((tenant) => (
                <ExposureBar key={tenant.label} label={tenant.label} value={monthlyRent > 0 ? (tenant.value / monthlyRent) * 100 : 0} color="#8b5cf6" />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-sm font-semibold text-white">Income contribution ranking</p>
            <p className="text-xs text-slate-500">Monthly rent contribution by property</p>
            <div className="mt-4 space-y-3">
              {incomeContribution.map((item) => (
                <div key={item.label}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-slate-300">{item.label}</span>
                    <span className="text-white">{pct(item.share)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-400" style={{ width: `${Math.max(item.share, 4)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-sm font-semibold text-white">Occupancy distribution</p>
            <p className="text-xs text-slate-500">Occupied, vacant and collection-risk footprint</p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { label: "Occupied", value: occupiedCount, tone: "success", color: "#10b981" },
                { label: "Vacant", value: vacantRows.length, tone: "warn", color: "#64748b" },
                { label: "At Risk", value: overdueRows.length + dueSoonRows.length, tone: "danger", color: "#ef4444" },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-white/[0.06] bg-slate-950/35 p-3 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${item.color}22` }}>
                    <span className="text-lg font-bold text-white">{item.value}</span>
                  </div>
                  <p className="mt-2 text-xs font-medium text-slate-300">{item.label}</p>
                  <div className="mt-2 flex justify-center">
                    <StatusPill label={item.value > 0 ? "Live" : "None"} tone={item.tone as Tone} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader
          eyebrow="Action Center"
          title="Operational queue"
          subtitle="Collections, renewals, vacancy recovery and documentation follow-ups."
        />
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {actionQueue.length === 0 ? (
            <p className="text-sm text-slate-500">No open actions in the property workflow.</p>
          ) : (
            actionQueue.map((action) => (
              <div key={action.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-white">{action.task}</p>
                    <p className="mt-1 text-xs text-slate-400">{action.context}</p>
                  </div>
                  <StatusPill label={action.due} tone={action.tone} />
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.12em] text-slate-500">
                  <span>Owner · {action.owner}</span>
                  <span>Real-estate ops</span>
                </div>
              </div>
            ))
          )}
        </div>
      </SurfaceCard>
    </div>
  );
}
