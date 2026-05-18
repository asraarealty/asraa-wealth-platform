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
  const intelligenceReady = (inventoryReady || Boolean(insights)) && !Boolean(degradedIntelligence);
  const advisoryReady = Boolean(Array.isArray(insights?.alerts) && insights.alerts.length > 0);
  const communicationReady = Boolean(client.email || client.phone || client.whatsapp);
  const portfolioReady = inventoryReady && onboardingReady;
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
