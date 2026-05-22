export type PlatformRole =
  | "client"
  | "admin"
  | "advisor"
  | "relationship_manager"
  | "operations"
  | "unknown";

const OPERATIONS_ROLES = new Set([
  "admin",
  "advisor",
  "relationship_manager",
  "relationship-manager",
  "rm",
  "operations",
  "ops",
]);

export function classifyPlatformRole(role: string | null | undefined): PlatformRole {
  const normalized = String(role ?? "").trim().toLowerCase();
  if (!normalized) return "unknown";
  if (OPERATIONS_ROLES.has(normalized)) {
    if (normalized === "admin") return "admin";
    if (normalized === "advisor") return "advisor";
    if (normalized === "relationship_manager" || normalized === "relationship-manager" || normalized === "rm") {
      return "relationship_manager";
    }
    return "operations";
  }
  return "client";
}

export function isOperationsRole(role: string | null | undefined) {
  const classified = classifyPlatformRole(role);
  return classified === "admin" || classified === "advisor" || classified === "relationship_manager" || classified === "operations";
}

