import { getContractRegistryEntry } from "@/lib/api/registry";
import { validateContractRequest } from "@/lib/api/runtimeValidators";
import type { ContractHttpMethod, ContractRegistryEntry } from "@/lib/contracts";

export interface ContractRequestDescriptor {
  key: string;
  method: ContractHttpMethod;
  path: string;
  registry: ContractRegistryEntry;
  body?: unknown;
}

interface ResolveContractRequestInput {
  pathParams?: Record<string, string | number | boolean>;
  query?: Record<string, unknown>;
  body?: unknown;
  validate?: boolean;
}

function buildPathFromTemplate(route: string, pathParams: ResolveContractRequestInput["pathParams"]): string {
  return route.replace(/\{([^}]+)\}/g, (_, token: string) => {
    const value = pathParams?.[token];
    if (value === undefined || value === null) {
      throw new Error(`Missing contract path parameter: ${token}`);
    }
    return encodeURIComponent(String(value));
  });
}

function buildQueryString(query?: Record<string, unknown>): string {
  if (!query) return "";
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== undefined && item !== null && item !== "") {
          params.append(key, String(item));
        }
      }
      continue;
    }
    params.set(key, String(value));
  }

  const encoded = params.toString();
  return encoded ? `?${encoded}` : "";
}

export function resolveContractRequest(
  key: string,
  { pathParams, query, body, validate = true }: ResolveContractRequestInput = {}
): ContractRequestDescriptor {
  const registry = getContractRegistryEntry(key);

  if (validate) {
    const validation = validateContractRequest(key, { pathParams, query, body });
    if (!validation.valid) {
      throw new Error(`Contract validation failed for ${key}: ${validation.errors.join("; ")}`);
    }
  }

  const path = `${buildPathFromTemplate(registry.route, pathParams)}${buildQueryString(query)}`;
  return {
    key,
    method: registry.method,
    path,
    registry,
    body,
  };
}
