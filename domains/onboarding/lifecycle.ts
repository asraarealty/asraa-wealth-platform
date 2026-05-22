import { LIFECYCLE_ORDER } from "@/domains/onboarding/constants";
import type { ClientFinancialProfile, ClientIdentityProfile, OnboardingDraft, OnboardingLifecycleState } from "@/domains/onboarding/types";

export function isIdentityComplete(identity: ClientIdentityProfile) {
  return Boolean(
    identity.name.trim() &&
      identity.mobile.trim() &&
      identity.email.trim() &&
      identity.pan.trim() &&
      identity.dob.trim() &&
      identity.city.trim()
  );
}

export function isFinancialProfileComplete(financial: ClientFinancialProfile) {
  return Boolean(
    financial.investorType &&
      financial.riskAppetite &&
      financial.netWorthRange &&
      financial.investmentGoals.length > 0 &&
      financial.existingAssetClasses.length > 0
  );
}

export function isProfileComplete(draft: OnboardingDraft) {
  return isIdentityComplete(draft.identity) && isFinancialProfileComplete(draft.financial);
}

export function deriveLifecycleState(draft: OnboardingDraft): OnboardingLifecycleState {
  if (draft.currentStep === "activation") return "activated";
  if (draft.advisorAssistScheduled) return "advisor_review";
  if (draft.processingStageIndex > 0) return "processing";
  if (draft.uploadQueue.some((item) => item.status === "uploaded" || item.status === "processing" || item.status === "processed")) {
    return "documents_uploaded";
  }
  if (isProfileComplete(draft)) return "profile_completed";
  return "not_started";
}

export function lifecycleProgress(state: OnboardingLifecycleState) {
  const index = LIFECYCLE_ORDER.indexOf(state);
  if (index < 0) return 0;
  if (LIFECYCLE_ORDER.length === 1) return 100;
  return (index / (LIFECYCLE_ORDER.length - 1)) * 100;
}
