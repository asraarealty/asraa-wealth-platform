export type OnboardingLifecycleState =
  | "not_started"
  | "profile_completed"
  | "documents_uploaded"
  | "processing"
  | "advisor_review"
  | "activated";

export type OnboardingStepId = "welcome" | "profile" | "assets" | "import" | "activation";

export type InvestorType =
  | "Retail Investor"
  | "HNI"
  | "UHNI"
  | "Family Office"
  | "Institutional";

export type RiskAppetite = "Conservative" | "Balanced" | "Growth" | "Aggressive";

export type NetWorthRange =
  | "Below ₹50L"
  | "₹50L - ₹2Cr"
  | "₹2Cr - ₹10Cr"
  | "₹10Cr - ₹25Cr"
  | "Above ₹25Cr";

export type UploadDocumentStatus = "queued" | "uploading" | "uploaded" | "processing" | "processed" | "failed";

export interface ClientIdentityProfile {
  name: string;
  mobile: string;
  email: string;
  pan: string;
  dob: string;
  city: string;
}

export interface ClientFinancialProfile {
  investorType: InvestorType | "";
  riskAppetite: RiskAppetite | "";
  investmentGoals: string[];
  existingAssetClasses: string[];
  netWorthRange: NetWorthRange | "";
}

export interface UploadQueueItem {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  progress: number;
  status: UploadDocumentStatus;
}

export interface OnboardingDraft {
  currentStep: OnboardingStepId;
  lifecycleState: OnboardingLifecycleState;
  identity: ClientIdentityProfile;
  financial: ClientFinancialProfile;
  selectedAssetClasses: string[];
  uploadQueue: UploadQueueItem[];
  manualEntryEnabled: boolean;
  advisorAssistScheduled: boolean;
  processingStageIndex: number;
  updatedAt: string;
}
