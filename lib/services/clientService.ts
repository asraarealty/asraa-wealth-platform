import { fetcher, type Client } from "@/lib/api";

export type ClientOperationalStatus =
  | "lead"
  | "onboarding"
  | "pending_kyc"
  | "approved"
  | "active"
  | "suspended"
  | "archived";
export type ClientApprovalStatus = "approved" | "rejected" | "pending";

export const ALLOWED_TRANSITIONS: Record<ClientOperationalStatus, ClientOperationalStatus[]> = {
  lead: ["onboarding"],
  onboarding: ["pending_kyc"],
  pending_kyc: ["approved"],
  approved: ["active"],
  active: ["suspended", "archived"],
  suspended: ["active"],
  archived: [],
};

export function canTransitionClientStatus(
  current: ClientOperationalStatus,
  next: ClientOperationalStatus
) {
  return current === next || ALLOWED_TRANSITIONS[current].includes(next);
}

export interface ClientNotificationPreferences {
  email: boolean;
  whatsapp: boolean;
  sms: boolean;
  push: boolean;
}

export interface ClientProfile {
  id: number;
  name: string;
  email: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  dob?: string;
  createdAt?: string;
  status: ClientOperationalStatus;
  canonicalStatus: ClientOperationalStatus;
  isActive: boolean;
  isArchived: boolean;
  archivedAt?: string;
  approvalStatus: ClientApprovalStatus;
  subscriptionTier?: string;
  onboardingStatus?: string;
  relationshipManager?: string;
  advisorAssigned?: string;
  leadSource?: string;
  campaignSegmentation?: string;
  tags: string[];
  notes?: string;
  netWorth?: number;
  riskProfile?: string;
  onboardingStage?: string;
  kycStatus?: string;
  investmentObjective?: string;
  financialPlanningStatus?: string;
  incomeBracket?: string;
  investmentPreference?: string;
  lastLogin?: string;
  lastActivity?: string;
  notificationPreferences: ClientNotificationPreferences;
}

export interface ClientUpdatePayload {
  status?: ClientOperationalStatus;
  name?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  dob?: string;
  netWorth?: number;
  riskProfile?: string;
  incomeBracket?: string;
  investmentPreference?: string;
  relationshipManager?: string;
  advisorAssigned?: string;
  leadSource?: string;
  tags?: string[];
  campaignSegmentation?: string;
  approvalStatus?: ClientApprovalStatus;
  subscriptionTier?: string;
  onboardingStatus?: string;
  onboardingStage?: string;
  kycStatus?: string;
  investmentObjective?: string;
  financialPlanningStatus?: string;
  notificationPreferences?: Partial<ClientNotificationPreferences>;
  notes?: string;
}

function unwrap<T>(response: any): T {
  if (response && typeof response === "object") {
    if (response.data && typeof response.data === "object" && "data" in response.data) {
      return response.data.data as T;
    }
    if ("data" in response) return response.data as T;
  }
  return response as T;
}

function toStringValue(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function toNumberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toTags(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((tag): tag is string => typeof tag === "string")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
}

function toNotificationPreferences(value: unknown): ClientNotificationPreferences {
  if (value && typeof value === "object") {
    const prefs = value as Record<string, unknown>;
    return {
      email: Boolean(prefs.email),
      whatsapp: Boolean(prefs.whatsapp),
      sms: Boolean(prefs.sms),
      push: Boolean(prefs.push),
    };
  }
  return { email: false, whatsapp: false, sms: false, push: false };
}

function normalizeStatus(value: unknown, raw: Record<string, unknown>): ClientOperationalStatus {
  const canonical = String(raw.canonical_status ?? raw.canonicalStatus ?? "").toLowerCase();
  if (["lead", "onboarding", "pending_kyc", "approved", "active", "suspended", "archived"].includes(canonical)) {
    return canonical as ClientOperationalStatus;
  }

  const explicit = String(value ?? "").toLowerCase();
  if (["lead", "onboarding", "pending_kyc", "approved", "active", "suspended", "archived"].includes(explicit)) {
    return explicit as ClientOperationalStatus;
  }
  if (explicit === "pending") return "onboarding";
  if (explicit === "inactive" || explicit === "rejected") return "archived";
  if (raw.archived_at || raw.archivedAt || raw.deleted_at || raw.deletedAt || raw.is_archived) {
    return "archived";
  }
  if (Boolean(raw.is_suspended ?? raw.isSuspended)) return "suspended";

  const onboardingStatus = String(raw.onboarding_status ?? raw.onboardingStatus ?? "").toLowerCase();
  if (onboardingStatus === "lead") return "lead";
  if (["pipeline", "onboarding", "documents", "verification"].includes(onboardingStatus)) return "onboarding";

  const kycStatus = String(raw.kyc_status ?? raw.kycStatus ?? "").toLowerCase();
  if (["pending", "in_progress", "under_review", "review"].includes(kycStatus)) return "pending_kyc";

  const approved = raw.is_approved === true || raw.approved === true || onboardingStatus === "live" || kycStatus === "approved";
  if (approved && Boolean(raw.is_active ?? raw.isActive ?? false)) return "active";
  if (approved) return "approved";
  return "lead";
}

function normalizeApprovalStatus(value: unknown, raw: Record<string, unknown>): ClientApprovalStatus {
  const explicit = String(value ?? "").toLowerCase();
  if (["approved", "rejected", "pending"].includes(explicit)) {
    return explicit as ClientApprovalStatus;
  }
  if (raw.is_approved === true || raw.approved === true) return "approved";
  const canonicalStatus = String(raw.canonical_status ?? raw.canonicalStatus ?? raw.status ?? "").toLowerCase();
  if (["approved", "active"].includes(canonicalStatus)) return "approved";
  if (canonicalStatus === "archived") return "rejected";
  if (raw.is_rejected === true || raw.rejected === true) return "rejected";
  return "pending";
}

export function normalizeClientRecord(value: unknown): ClientProfile {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const status = normalizeStatus(raw.status, raw);

  return {
    id: Number(raw.id ?? 0),
    name: toStringValue(raw.name) ?? "Unnamed client",
    email: toStringValue(raw.email) ?? "",
    phone: toStringValue(raw.phone),
    whatsapp: toStringValue(raw.whatsapp),
    address: toStringValue(raw.address),
    dob: toStringValue(raw.dob ?? raw.date_of_birth ?? raw.dateOfBirth),
    createdAt: toStringValue(raw.created_at ?? raw.createdAt),
    status,
    canonicalStatus: status,
    isActive: status === "active",
    isArchived: status === "archived",
    archivedAt: toStringValue(raw.archived_at ?? raw.archivedAt ?? raw.deleted_at ?? raw.deletedAt),
    approvalStatus: normalizeApprovalStatus(raw.approval_status ?? raw.approvalStatus, raw),
    subscriptionTier: toStringValue(raw.subscription_tier ?? raw.subscriptionTier),
    onboardingStatus: toStringValue(raw.onboarding_status ?? raw.onboardingStatus),
    relationshipManager: toStringValue(raw.relationship_manager ?? raw.relationshipManager),
    advisorAssigned: toStringValue(raw.advisor_assigned ?? raw.advisorAssigned),
    leadSource: toStringValue(raw.lead_source ?? raw.leadSource),
    campaignSegmentation: toStringValue(raw.campaign_segmentation ?? raw.campaignSegmentation),
    tags: toTags(raw.tags),
    notes: toStringValue(raw.notes),
    netWorth: toNumberValue(raw.net_worth ?? raw.netWorth),
    riskProfile: toStringValue(raw.risk_profile ?? raw.riskProfile),
    onboardingStage: toStringValue(raw.onboarding_stage ?? raw.onboardingStage),
    kycStatus: toStringValue(raw.kyc_status ?? raw.kycStatus),
    investmentObjective: toStringValue(raw.investment_objective ?? raw.investmentObjective),
    financialPlanningStatus: toStringValue(raw.financial_planning_status ?? raw.financialPlanningStatus),
    incomeBracket: toStringValue(raw.income_bracket ?? raw.incomeBracket),
    investmentPreference: toStringValue(raw.investment_preference ?? raw.investmentPreference),
    lastLogin: toStringValue(raw.last_login ?? raw.lastLogin),
    lastActivity: toStringValue(raw.last_activity ?? raw.lastActivity),
    notificationPreferences: toNotificationPreferences(raw.notification_preferences ?? raw.notificationPreferences),
  };
}

function serializeNotificationPreferences(value?: Partial<ClientNotificationPreferences>) {
  return {
    email: Boolean(value?.email),
    whatsapp: Boolean(value?.whatsapp),
    sms: Boolean(value?.sms),
    push: Boolean(value?.push),
  };
}

export function buildClientPayload(payload: ClientUpdatePayload) {
  const body: Record<string, unknown> = {};
  const mapping: Array<[keyof ClientUpdatePayload, string]> = [
    ["status", "status"],
    ["name", "name"],
    ["email", "email"],
    ["phone", "phone"],
    ["whatsapp", "whatsapp"],
    ["address", "address"],
    ["dob", "dob"],
    ["netWorth", "net_worth"],
    ["riskProfile", "risk_profile"],
    ["incomeBracket", "income_bracket"],
    ["investmentPreference", "investment_preference"],
    ["relationshipManager", "relationship_manager"],
    ["advisorAssigned", "advisor_assigned"],
    ["leadSource", "lead_source"],
    ["campaignSegmentation", "campaign_segmentation"],
    ["approvalStatus", "approval_status"],
    ["subscriptionTier", "subscription_tier"],
    ["onboardingStatus", "onboarding_status"],
    ["onboardingStage", "onboarding_stage"],
    ["kycStatus", "kyc_status"],
    ["investmentObjective", "investment_objective"],
    ["financialPlanningStatus", "financial_planning_status"],
    ["notes", "notes"],
  ];

  for (const [key, outputKey] of mapping) {
    const value = payload[key];
    if (value !== undefined) body[outputKey] = value;
  }
  if (payload.status !== undefined) body.canonical_status = payload.status;

  if (payload.tags !== undefined) body.tags = payload.tags;
  if (payload.notificationPreferences !== undefined) {
    body.notification_preferences = serializeNotificationPreferences(payload.notificationPreferences);
  }

  return body;
}

async function fetchClientCollection(path: string, signal?: AbortSignal): Promise<ClientProfile[]> {
  const rawResponse = await fetcher<any>(path, { signal, raw: true, cache: "no-store" });
  const data = unwrap<any>(rawResponse);
  const list = Array.isArray(data) ? data : [];
  return list.map(normalizeClientRecord);
}

async function fetchClientResource(path: string, options?: { signal?: AbortSignal; method?: "GET" | "POST" | "PATCH"; body?: Record<string, unknown> }) {
  const rawResponse = await fetcher<any>(path, {
    raw: true,
    cache: "no-store",
    method: options?.method,
    body: options?.body,
    signal: options?.signal,
  });
  return normalizeClientRecord(unwrap<any>(rawResponse));
}

export function createClient(payload: ClientUpdatePayload, signal?: AbortSignal) {
  return fetchClientResource("/clients", {
    method: "POST",
    body: buildClientPayload(payload),
    signal,
  });
}

export function fetchAdminClients(signal?: AbortSignal) {
  return fetchClientCollection("/clients/admin", signal);
}

export function fetchClientById(id: number, signal?: AbortSignal) {
  return fetchClientResource(`/clients/${encodeURIComponent(id)}`, { signal });
}

export function updateClient(id: number, payload: ClientUpdatePayload, signal?: AbortSignal) {
  return fetchClientResource(`/clients/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: buildClientPayload(payload),
    signal,
  });
}

export function updateClientStatus(
  id: number,
  status: ClientOperationalStatus,
  signal?: AbortSignal,
  currentStatus?: ClientOperationalStatus
) {
  if (currentStatus && !canTransitionClientStatus(currentStatus, status)) {
    throw new Error(`Invalid lifecycle transition: ${currentStatus} -> ${status}`);
  }
  logClientAuditAction("status.update.requested", { id, status, currentStatus: currentStatus ?? null });
  return fetchClientResource(`/clients/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: { status, canonical_status: status, is_active: status === "active" },
    signal,
  });
}

export function approveClient(
  id: number,
  signal?: AbortSignal,
  currentStatus?: ClientOperationalStatus
) {
  if (currentStatus && !canTransitionClientStatus(currentStatus, "approved")) {
    throw new Error(`Invalid lifecycle transition: ${currentStatus} -> approved`);
  }
  logClientAuditAction("client.approve.requested", { id, currentStatus: currentStatus ?? null });
  return updateClient(id, { approvalStatus: "approved", status: "approved", onboardingStatus: "live", kycStatus: "approved" }, signal);
}

export function rejectClient(id: number, signal?: AbortSignal) {
  return updateClient(id, { approvalStatus: "rejected", status: "archived" }, signal);
}

export function suspendClient(id: number, signal?: AbortSignal) {
  logClientAuditAction("client.suspend.requested", { id });
  return updateClientStatus(id, "suspended", signal);
}

export function deactivateClient(id: number, signal?: AbortSignal) {
  logClientAuditAction("client.deactivate.requested", { id });
  return updateClientStatus(id, "archived", signal);
}

export function archiveClient(id: number, signal?: AbortSignal) {
  logClientAuditAction("client.archive.requested", { id });
  return fetchClientResource(`/clients/${encodeURIComponent(id)}/archive`, {
    method: "POST",
    signal,
  });
}

export function restoreClient(id: number, signal?: AbortSignal) {
  logClientAuditAction("client.restore.requested", { id });
  return fetchClientResource(`/clients/${encodeURIComponent(id)}/restore`, {
    method: "PATCH",
    signal,
  });
}

export function deleteClient(id: number, signal?: AbortSignal) {
  logClientAuditAction("client.delete.requested", { id });
  return fetcher<void>(`/clients/${encodeURIComponent(id)}`, {
    method: "DELETE",
    signal,
  });
}

export async function getClients(signal?: AbortSignal): Promise<Client[]> {
  const data = await fetcher<Client[]>("/clients", { signal });
  return Array.isArray(data) ? data : [];
}

function logClientAuditAction(action: string, payload: Record<string, unknown>) {
  try {
    console.info("[client-audit]", JSON.stringify({ action, at: new Date().toISOString(), ...payload }));
  } catch {
    // no-op
  }
}
