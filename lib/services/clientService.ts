import { fetcher, type Client } from "@/lib/api";

export type ClientOperationalStatus = "active" | "inactive" | "suspended" | "archived";
export type ClientApprovalStatus = "approved" | "rejected" | "pending";

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
  address?: string;
  dob?: string;
  createdAt?: string;
  status: ClientOperationalStatus;
  isActive: boolean;
  isArchived: boolean;
  archivedAt?: string;
  approvalStatus: ClientApprovalStatus;
  subscriptionTier?: string;
  onboardingStatus?: string;
  relationshipManager?: string;
  leadSource?: string;
  campaignSegmentation?: string;
  tags: string[];
  notes?: string;
  netWorth?: number;
  riskProfile?: string;
  incomeBracket?: string;
  investmentPreference?: string;
  lastLogin?: string;
  lastActivity?: string;
  notificationPreferences: ClientNotificationPreferences;
}

export interface ClientUpdatePayload {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  dob?: string;
  netWorth?: number;
  riskProfile?: string;
  incomeBracket?: string;
  investmentPreference?: string;
  relationshipManager?: string;
  leadSource?: string;
  tags?: string[];
  campaignSegmentation?: string;
  approvalStatus?: ClientApprovalStatus;
  subscriptionTier?: string;
  onboardingStatus?: string;
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
  const explicit = String(value ?? "").toLowerCase();
  if (["active", "inactive", "suspended", "archived"].includes(explicit)) {
    return explicit as ClientOperationalStatus;
  }
  if (raw.archived_at || raw.archivedAt || raw.deleted_at || raw.deletedAt || raw.is_archived) {
    return "archived";
  }
  if (Boolean(raw.is_suspended ?? raw.isSuspended)) return "suspended";
  return Boolean(raw.is_active ?? raw.isActive ?? true) ? "active" : "inactive";
}

function normalizeApprovalStatus(value: unknown, raw: Record<string, unknown>): ClientApprovalStatus {
  const explicit = String(value ?? "").toLowerCase();
  if (["approved", "rejected", "pending"].includes(explicit)) {
    return explicit as ClientApprovalStatus;
  }
  if (raw.is_approved === true || raw.approved === true) return "approved";
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
    address: toStringValue(raw.address),
    dob: toStringValue(raw.dob ?? raw.date_of_birth ?? raw.dateOfBirth),
    createdAt: toStringValue(raw.created_at ?? raw.createdAt),
    status,
    isActive: status === "active",
    isArchived: status === "archived",
    archivedAt: toStringValue(raw.archived_at ?? raw.archivedAt ?? raw.deleted_at ?? raw.deletedAt),
    approvalStatus: normalizeApprovalStatus(raw.approval_status ?? raw.approvalStatus, raw),
    subscriptionTier: toStringValue(raw.subscription_tier ?? raw.subscriptionTier),
    onboardingStatus: toStringValue(raw.onboarding_status ?? raw.onboardingStatus),
    relationshipManager: toStringValue(raw.relationship_manager ?? raw.relationshipManager),
    leadSource: toStringValue(raw.lead_source ?? raw.leadSource),
    campaignSegmentation: toStringValue(raw.campaign_segmentation ?? raw.campaignSegmentation),
    tags: toTags(raw.tags),
    notes: toStringValue(raw.notes),
    netWorth: toNumberValue(raw.net_worth ?? raw.netWorth),
    riskProfile: toStringValue(raw.risk_profile ?? raw.riskProfile),
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
    ["name", "name"],
    ["email", "email"],
    ["phone", "phone"],
    ["address", "address"],
    ["dob", "dob"],
    ["netWorth", "net_worth"],
    ["riskProfile", "risk_profile"],
    ["incomeBracket", "income_bracket"],
    ["investmentPreference", "investment_preference"],
    ["relationshipManager", "relationship_manager"],
    ["leadSource", "lead_source"],
    ["campaignSegmentation", "campaign_segmentation"],
    ["approvalStatus", "approval_status"],
    ["subscriptionTier", "subscription_tier"],
    ["onboardingStatus", "onboarding_status"],
    ["notes", "notes"],
  ];

  for (const [key, outputKey] of mapping) {
    const value = payload[key];
    if (value !== undefined) body[outputKey] = value;
  }

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

export function updateClientStatus(id: number, status: ClientOperationalStatus, signal?: AbortSignal) {
  return fetchClientResource(`/clients/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: { status, is_active: status === "active" },
    signal,
  });
}

export function archiveClient(id: number, signal?: AbortSignal) {
  return fetchClientResource(`/clients/${encodeURIComponent(id)}/archive`, {
    method: "POST",
    signal,
  });
}

export function restoreClient(id: number, signal?: AbortSignal) {
  return fetchClientResource(`/clients/${encodeURIComponent(id)}/restore`, {
    method: "PATCH",
    signal,
  });
}

export async function getClients(signal?: AbortSignal): Promise<Client[]> {
  const data = await fetcher<Client[]>("/clients", { signal });
  return Array.isArray(data) ? data : [];
}
