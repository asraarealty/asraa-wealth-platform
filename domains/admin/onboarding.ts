import type { EnrichedClient } from "@/lib/utils/adminClientIntelligence";

export type AdminOnboardingState =
  | "lead_created"
  | "profile_created"
  | "documents_pending"
  | "documents_uploaded"
  | "processing"
  | "advisor_review"
  | "awaiting_client_confirmation"
  | "activated";

export type ProcessingRuntimeState =
  | "Processing Holdings"
  | "Building Allocation"
  | "Generating Intelligence"
  | "Activating Wealth Dashboard";

export const ADMIN_ONBOARDING_STATES: AdminOnboardingState[] = [
  "lead_created",
  "profile_created",
  "documents_pending",
  "documents_uploaded",
  "processing",
  "advisor_review",
  "awaiting_client_confirmation",
  "activated",
];

export const PROCESSING_RUNTIME_STATES: ProcessingRuntimeState[] = [
  "Processing Holdings",
  "Building Allocation",
  "Generating Intelligence",
  "Activating Wealth Dashboard",
];

export const DOCUMENT_CATEGORIES = [
  { id: "cas_statements", label: "CAS statements" },
  { id: "broker_pdfs", label: "Broker PDFs" },
  { id: "screenshots", label: "Screenshots" },
  { id: "property_documents", label: "Property documents" },
  { id: "excel_holdings", label: "Excel holdings" },
  { id: "rent_records", label: "Rent records" },
] as const;

export interface DocumentCategoryState {
  id: (typeof DOCUMENT_CATEGORIES)[number]["id"];
  label: string;
  uploaded: number;
  required: number;
  status: "missing" | "pending" | "complete";
}

export interface ClientOnboardingOverview {
  state: AdminOnboardingState;
  completionPct: number;
  stateIndex: number;
  runtimeState: ProcessingRuntimeState | null;
  missingProfileFields: string[];
  missingDocumentLabels: string[];
  advisorAssigned: boolean;
  activationReady: boolean;
  documentCategories: DocumentCategoryState[];
}

function includesAny(value: string, needles: string[]) {
  return needles.some((needle) => value.includes(needle));
}

function normalizeString(value?: string) {
  return String(value ?? "").trim().toLowerCase();
}

export function deriveClientOnboardingOverview(client: EnrichedClient): ClientOnboardingOverview {
  const stage = `${normalizeString(client.onboardingStatus)} ${normalizeString(client.onboardingStage)}`;
  const hasLeadStatus = client.canonicalStatus === "lead";

  const missingProfileFields = [
    client.name ? null : "Name",
    client.phone || client.whatsapp ? null : "Mobile",
    client.email ? null : "Email",
    client.dob ? null : "DOB",
    client.relationshipManager || client.advisorAssigned ? null : "Relationship Manager",
    client.riskProfile ? null : "Risk Appetite",
  ].filter(Boolean) as string[];

  const stockLikeCount = client.assets.filter((asset) => asset.type === "stock" || asset.type === "mf").length;
  const propertyCount = client.assets.filter((asset) => asset.type === "property").length;
  const rentRecordCount = client.assets.filter((asset) => asset.type === "property" && Boolean(asset.tenantName ?? asset.tenant_name)).length;
  const allAssetCount = client.assets.length;

  const documentCategories: DocumentCategoryState[] = [
    {
      id: "cas_statements",
      label: "CAS statements",
      uploaded: stockLikeCount > 0 ? 1 : 0,
      required: 1,
      status: stockLikeCount > 0 ? "complete" : "missing",
    },
    {
      id: "broker_pdfs",
      label: "Broker PDFs",
      uploaded: client.assets.filter((asset) => asset.type === "stock").length > 0 ? 1 : 0,
      required: 1,
      status: client.assets.some((asset) => asset.type === "stock") ? "complete" : "pending",
    },
    {
      id: "screenshots",
      label: "Screenshots",
      uploaded: includesAny(stage, ["screen", "snapshot"]) ? 1 : 0,
      required: 1,
      status: includesAny(stage, ["screen", "snapshot"]) ? "complete" : "pending",
    },
    {
      id: "property_documents",
      label: "Property documents",
      uploaded: propertyCount,
      required: Math.max(propertyCount > 0 ? 1 : 0, 1),
      status: propertyCount > 0 ? "complete" : "pending",
    },
    {
      id: "excel_holdings",
      label: "Excel holdings",
      uploaded: allAssetCount > 0 ? 1 : 0,
      required: 1,
      status: allAssetCount > 0 ? "complete" : "missing",
    },
    {
      id: "rent_records",
      label: "Rent records",
      uploaded: rentRecordCount,
      required: Math.max(propertyCount, 1),
      status: rentRecordCount > 0 ? "complete" : propertyCount > 0 ? "missing" : "pending",
    },
  ];

  const hasDocuments = documentCategories.some((item) => item.uploaded > 0);
  const missingDocumentLabels = documentCategories
    .filter((item) => item.status !== "complete")
    .map((item) => item.label);

  const isActivated = client.canonicalStatus === "active" || includesAny(stage, ["activated", "live"]);
  const isAwaitingClientConfirmation = includesAny(stage, ["awaiting_client_confirmation", "awaiting confirmation", "client confirmation"]);
  const isAdvisorReview = includesAny(stage, ["advisor_review", "advisor review", "review", "rm review"]);
  const isProcessing = includesAny(stage, ["processing", "valuation", "analysis", "allocation", "intelligence generation", "activating"]);

  let state: AdminOnboardingState = "profile_created";
  if (isActivated) {
    state = "activated";
  } else if (isAwaitingClientConfirmation) {
    state = "awaiting_client_confirmation";
  } else if (isAdvisorReview) {
    state = "advisor_review";
  } else if (isProcessing) {
    state = "processing";
  } else if (hasDocuments) {
    state = "documents_uploaded";
  } else if (!hasDocuments && missingProfileFields.length === 0) {
    state = "documents_pending";
  } else if (hasLeadStatus && missingProfileFields.length > 0) {
    state = "lead_created";
  }

  const stateIndex = ADMIN_ONBOARDING_STATES.indexOf(state);
  const completionPct = stateIndex <= 0
    ? 8
    : Math.round((stateIndex / (ADMIN_ONBOARDING_STATES.length - 1)) * 100);

  const runtimeState = state !== "processing"
    ? null
    : allAssetCount === 0
      ? PROCESSING_RUNTIME_STATES[0]
      : allAssetCount <= 2
        ? PROCESSING_RUNTIME_STATES[1]
        : allAssetCount <= 5
          ? PROCESSING_RUNTIME_STATES[2]
          : PROCESSING_RUNTIME_STATES[3];

  const advisorAssigned = Boolean(client.advisorAssigned || client.relationshipManager);
  const activationReady =
    missingProfileFields.length === 0 &&
    advisorAssigned &&
    hasDocuments &&
    client.kycStatus === "approved" &&
    (state === "advisor_review" || state === "awaiting_client_confirmation" || state === "activated");

  return {
    state,
    completionPct,
    stateIndex,
    runtimeState,
    missingProfileFields,
    missingDocumentLabels,
    advisorAssigned,
    activationReady,
    documentCategories,
  };
}

export function summarizeOnboardingPipeline(clients: EnrichedClient[]) {
  const overview = clients.map((client) => ({ client, onboarding: deriveClientOnboardingOverview(client) }));

  const pendingOnboardings = overview.filter(({ onboarding }) => onboarding.state !== "activated");
  const processingQueue = overview.filter(({ onboarding }) => onboarding.state === "processing");
  const incompleteClientSetups = overview.filter(({ onboarding }) => onboarding.missingProfileFields.length > 0);
  const missingDocuments = overview.filter(({ onboarding }) => onboarding.missingDocumentLabels.length > 0);
  const activationReady = overview.filter(({ onboarding }) => onboarding.activationReady);
  const unassignedAdvisors = overview.filter(({ onboarding }) => !onboarding.advisorAssigned);
  const onboardingAlerts = overview.filter(({ onboarding }) =>
    onboarding.state === "processing" ||
    onboarding.missingProfileFields.length > 0 ||
    onboarding.missingDocumentLabels.length > 0
  );

  return {
    overview,
    pendingOnboardings,
    processingQueue,
    incompleteClientSetups,
    missingDocuments,
    activationReady,
    unassignedAdvisors,
    onboardingAlerts,
  };
}
