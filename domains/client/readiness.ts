import type { ClientProfile } from "@/lib/services/clientService";
import type { Asset } from "@/lib/api";
import type { ClientIntelligenceData } from "@/domains/intelligence";

export interface ClientReadinessContract {
  onboardingReady: boolean;
  intelligenceReady: boolean;
  inventoryReady: boolean;
  advisoryReady: boolean;
  communicationReady: boolean;
  portfolioReady: boolean;
  relationshipReady: boolean;
  lifecycleReady: boolean;
}

export function deriveClientReadinessContract({
  client,
  assets,
  insights,
  degradedIntelligence,
}: {
  client: ClientProfile;
  assets: Asset[];
  insights: ClientIntelligenceData["insights"] | null;
  degradedIntelligence?: boolean;
}): ClientReadinessContract {
  const status = client.canonicalStatus ?? client.status;
  const onboardingReady =
    status === "approved" ||
    status === "active" ||
    status === "suspended" ||
    status === "archived" ||
    String(client.onboardingStatus ?? "").toLowerCase() === "live";
  const inventoryReady = assets.length > 0;
  // intelligenceReady: if insights data is present (possibly from a previous successful fetch),
  // treat intelligence as ready regardless of the degraded flag — valid cached data must not be
  // permanently suppressed by a transient fetch failure.  When no insights are cached yet, fall
  // back to requiring inventory AND no active degradation so that a hard failure still blocks.
  const intelligenceReady = Boolean(insights) || (inventoryReady && !Boolean(degradedIntelligence));
  const advisoryReady = Boolean(Array.isArray(insights?.alerts) && insights.alerts.length > 0);
  const communicationReady = Boolean(client.email || client.phone || client.whatsapp);
  // portfolioReady: activate whenever the admin has inventory for this client.
  // Do not gate on onboardingReady — the admin must be able to inspect portfolio data
  // for clients at any lifecycle stage (lead, onboarding, etc.).
  const portfolioReady = inventoryReady;
  const relationshipReady = Boolean(client.relationshipManager || client.advisorAssigned);
  const lifecycleReady = status !== "lead" && status !== "onboarding";

  return {
    onboardingReady,
    intelligenceReady,
    inventoryReady,
    advisoryReady,
    communicationReady,
    portfolioReady,
    relationshipReady,
    lifecycleReady,
  };
}
