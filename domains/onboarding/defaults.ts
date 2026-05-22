import type { OnboardingDraft } from "@/domains/onboarding/types";

export function createDefaultOnboardingDraft(): OnboardingDraft {
  return {
    currentStep: "welcome",
    lifecycleState: "not_started",
    identity: {
      name: "",
      mobile: "",
      email: "",
      pan: "",
      dob: "",
      city: "",
    },
    financial: {
      investorType: "",
      riskAppetite: "",
      investmentGoals: [],
      existingAssetClasses: [],
      netWorthRange: "",
    },
    selectedAssetClasses: [],
    uploadQueue: [],
    manualEntryEnabled: false,
    advisorAssistScheduled: false,
    processingStageIndex: 0,
    updatedAt: new Date().toISOString(),
  };
}
