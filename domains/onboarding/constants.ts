import type { InvestorType, NetWorthRange, OnboardingLifecycleState, OnboardingStepId, RiskAppetite } from "@/domains/onboarding/types";

export const ONBOARDING_STEPS: Array<{ id: OnboardingStepId; label: string; subtitle: string }> = [
  { id: "welcome", label: "Welcome", subtitle: "Concierge introduction" },
  { id: "profile", label: "Client Profile", subtitle: "Identity + suitability" },
  { id: "assets", label: "Asset Classes", subtitle: "Coverage setup" },
  { id: "import", label: "Portfolio Import", subtitle: "Document onboarding" },
  { id: "activation", label: "Activation", subtitle: "Wealth OS reveal" },
];

export const ASSET_CLASS_OPTIONS = [
  { id: "stocks", label: "Stocks", description: "Listed equity mandates and direct equity allocation." },
  { id: "mutual-funds", label: "Mutual Funds", description: "Fund mandates across equity, debt, and hybrid strategy." },
  { id: "property", label: "Property", description: "Residential and commercial real estate holdings." },
  { id: "gold", label: "Gold", description: "Physical, ETF, and sovereign gold exposure." },
  { id: "fixed-income", label: "Fixed Income", description: "Bonds, deposits, and yield-oriented instruments." },
  { id: "cash", label: "Cash", description: "Liquidity reserves and treasury allocation." },
] as const;

export const INVESTOR_TYPE_OPTIONS: InvestorType[] = ["Retail Investor", "HNI", "UHNI", "Family Office", "Institutional"];
export const RISK_APPETITE_OPTIONS: RiskAppetite[] = ["Conservative", "Balanced", "Growth", "Aggressive"];
export const NET_WORTH_RANGES: NetWorthRange[] = [
  "Below ₹50L",
  "₹50L - ₹2Cr",
  "₹2Cr - ₹10Cr",
  "₹10Cr - ₹25Cr",
  "Above ₹25Cr",
];

export const PORTFOLIO_RUNTIME_STATES = [
  "Analyzing portfolio",
  "Building allocation",
  "Generating insights",
  "Preparing wealth dashboard",
] as const;

export const LIFECYCLE_ORDER: OnboardingLifecycleState[] = [
  "not_started",
  "profile_completed",
  "documents_uploaded",
  "processing",
  "advisor_review",
  "activated",
];

export const ONBOARDING_STORAGE_KEY = "asraa.wealth.onboarding.draft.v1";
