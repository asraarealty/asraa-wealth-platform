import type { Asset } from "@/lib/api";
import type { ClientOperationalStatus, ClientProfile } from "@/lib/services/clientService";
import { createCanonicalAssetUniverse } from "@/lib/services/assets";
import { computePortfolioIntelligenceState } from "@/lib/services/portfolio";

export interface EnrichedClient extends ClientProfile {
  totalNetWorth: number;
  investedValue: number;
  unrealizedPnL: number;
  unrealizedPnLPct: number;
  stockValue: number;
  mfValue: number;
  propertyValue: number;
  commodityValue: number;
  equityExposurePct: number;
  commodityExposurePct: number;
  propertiesCount: number;
  monthlyRentIncome: number;
  occupiedProperties: number;
  occupancyPct: number;
  allocationMix: { stock: number; mf: number; property: number; commodity: number };
  lastActivity: string | undefined;
  topHoldingName: string | undefined;
  diversificationScore: number;
  concentrationRisk: string;
  operationalFallback: string;
  activitySignal: string;
  assets: Asset[];
}

export interface AdminClientsKPIs {
  totalClients: number;
  activeClients: number;
  onboardingClients: number;
  suspendedClients: number;
  archivedClients: number;
  totalAUM: number;
  totalProperties: number;
  avgPortfolioValue: number;
}

export const EMPTY_KPIS: AdminClientsKPIs = {
  totalClients: 0,
  activeClients: 0,
  onboardingClients: 0,
  suspendedClients: 0,
  archivedClients: 0,
  totalAUM: 0,
  totalProperties: 0,
  avgPortfolioValue: 0,
};

function pct(value: number, total: number) {
  if (total <= 0) return 0;
  return Number(((value / total) * 100).toFixed(2));
}

function daysSince(iso?: string) {
  if (!iso) return null;
  const value = new Date(iso).getTime();
  if (!Number.isFinite(value)) return null;
  return Math.floor((Date.now() - value) / (1000 * 60 * 60 * 24));
}

export function deriveOperationalFallback(assets: Asset[]) {
  if (assets.length === 0) return "Portfolio not onboarded";
  const totalValue = assets.reduce((sum, asset) => sum + Number(asset.value ?? 0), 0);
  if (totalValue <= 0) return "Awaiting holdings sync";
  const investedAssets = assets.filter((asset) => Number(asset.value ?? 0) > 0);
  if (investedAssets.length === 0) return "No active investments";
  if (assets.some((asset) => asset.type === "property") && !assets.some((asset) => asset.type === "property" && (asset.tenantName ?? asset.tenant_name))) {
    return "Property pipeline pending";
  }
  return `${investedAssets.length} assets in active rotation`;
}

export function deriveActivitySignal(client: ClientProfile, assets: Asset[]) {
  const latestActivity = client.lastActivity ?? client.lastLogin ?? client.createdAt;
  const inactivityDays = daysSince(latestActivity);
  if (inactivityDays == null) {
    return assets.length === 0 ? "Awaiting first onboarding event" : "Live monitoring active";
  }
  if (inactivityDays > 90) return `Inactive for ${inactivityDays} days`;
  if (inactivityDays > 30) return `Watch engagement · ${inactivityDays} days since activity`;
  return `Active within ${Math.max(inactivityDays, 0)} day(s)`;
}

export function enrichClients(
  clients: ClientProfile[],
  groupedAssets: Record<number, Asset[]>
): { clients: EnrichedClient[]; kpis: AdminClientsKPIs } {
  const enriched = clients.map((client) => {
    const assets = groupedAssets[client.id] ?? [];
    const holdings = createCanonicalAssetUniverse(assets);
    const propertyAssets = assets.filter((asset) => asset.type === "property");
    const occupiedProperties = propertyAssets.filter((asset) => Boolean(asset.tenantName ?? asset.tenant_name)).length;
    const topHolding = [...assets].sort((a, b) => Number(b.value ?? 0) - Number(a.value ?? 0))[0];
    const lastActivity = [
      client.lastActivity,
      client.lastLogin,
      client.createdAt,
      ...assets.map((asset) => asset.createdAt ?? asset.created_at),
    ]
      .filter(Boolean)
      .sort((a, b) => new Date(String(b)).getTime() - new Date(String(a)).getTime())[0] as string | undefined;
    const intelligence = computePortfolioIntelligenceState({
      holdings,
      lastActivityAt: String(lastActivity ?? ""),
    });

    const allocationMix = {
      stock: intelligence.allocation.stock,
      mf: intelligence.allocation.mf,
      property: intelligence.allocation.property,
      commodity: intelligence.allocation.commodity,
    };

    return {
      ...client,
      totalNetWorth: intelligence.summary.netWorth,
      investedValue: intelligence.summary.totalInvested,
      unrealizedPnL: intelligence.summary.totalReturn,
      unrealizedPnLPct: intelligence.summary.returnPct,
      stockValue: intelligence.valuation.holdings.filter((holding) => holding.type === "stock").reduce((sum, holding) => sum + holding.liveValue, 0),
      mfValue: intelligence.valuation.holdings.filter((holding) => holding.type === "mf").reduce((sum, holding) => sum + holding.liveValue, 0),
      propertyValue: intelligence.valuation.holdings.filter((holding) => holding.type === "property").reduce((sum, holding) => sum + holding.liveValue, 0),
      commodityValue: intelligence.valuation.holdings.filter((holding) => holding.type === "commodity").reduce((sum, holding) => sum + holding.liveValue, 0),
      equityExposurePct: Number((intelligence.allocation.stock + intelligence.allocation.mf).toFixed(2)),
      commodityExposurePct: intelligence.allocation.commodity,
      propertiesCount: propertyAssets.length,
      monthlyRentIncome: intelligence.realEstate.monthlyIncome,
      occupiedProperties,
      occupancyPct: intelligence.realEstate.occupancyPct,
      allocationMix,
      lastActivity,
      topHoldingName: topHolding?.name,
      diversificationScore: intelligence.rules.diversification.score,
      concentrationRisk: intelligence.rules.concentration.label,
      operationalFallback: deriveOperationalFallback(assets),
      activitySignal: intelligence.rules.inactivity.days == null ? deriveActivitySignal(client, assets) : intelligence.rules.inactivity.label,
      assets,
    };
  });

  const byStatus = (status: ClientOperationalStatus) => enriched.filter((client) => client.status === status).length;
  const onboardingClients = enriched.filter((client) => ["lead", "onboarding", "pending_kyc", "approved"].includes(client.status)).length;
  const totalAUM = enriched.reduce((sum, client) => sum + client.totalNetWorth, 0);
  const totalProperties = enriched.reduce((sum, client) => sum + client.propertiesCount, 0);

  return {
    clients: enriched,
    kpis: {
      totalClients: enriched.length,
      activeClients: byStatus("active"),
      onboardingClients,
      suspendedClients: byStatus("suspended"),
      archivedClients: byStatus("archived"),
      totalAUM,
      totalProperties,
      avgPortfolioValue: enriched.length > 0 ? totalAUM / enriched.length : 0,
    },
  };
}
