import backendOpenApi from "@/generated/contracts/backend_openapi.json";
import backendCapabilityReport from "@/generated/contracts/backend_capability_report.json";
import type {
  ContractHttpMethod,
  ContractPaginationMeta,
  ContractRegistryEntry,
  ContractSchema,
} from "@/lib/contracts";

type UnknownRecord = Record<string, unknown>;

const OPERATION_METHODS = ["get", "post", "put", "patch", "delete", "head", "options"] as const;

interface CapabilityEntry {
  method: ContractHttpMethod;
  route: string;
  authScope?: string | string[];
  capabilityTags?: string[];
  pagination?: Record<string, unknown>;
  retry?: Record<string, unknown>;
  cache?: Record<string, unknown>;
}

function normalizeMethod(method: string): ContractHttpMethod {
  return method.toUpperCase() as ContractHttpMethod;
}

function keyOf(method: ContractHttpMethod, route: string) {
  return `${method} ${route}`;
}

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function getSchemaFromContent(content: unknown): ContractSchema | undefined {
  const contentRecord = asRecord(content);
  const appJson = asRecord(contentRecord["application/json"]);
  const schema = appJson.schema;
  return schema && typeof schema === "object" ? (schema as ContractSchema) : undefined;
}

function extractResponseSchema(operation: UnknownRecord): ContractSchema | undefined {
  const responses = asRecord(operation.responses);
  const statusCode = Object.keys(responses).find((code) => code.startsWith("2"));
  if (!statusCode) return undefined;
  const response = asRecord(responses[statusCode]);
  return getSchemaFromContent(asRecord(response.content));
}

function extractRequestSchema(operation: UnknownRecord): ContractSchema | undefined {
  const requestBody = asRecord(operation.requestBody);
  return getSchemaFromContent(asRecord(requestBody.content));
}

function collectNullableFields(schema: ContractSchema | undefined, prefix = ""): string[] {
  if (!schema) return [];
  const nullableByTypeArray = Array.isArray(schema.type) && (schema.type as unknown[]).includes("null");
  const current = schema.nullable || nullableByTypeArray ? [prefix].filter(Boolean) : [];
  const nested = Object.entries(schema.properties ?? {}).flatMap(([key, value]) =>
    collectNullableFields(value, prefix ? `${prefix}.${key}` : key)
  );
  const oneOf = (schema.oneOf ?? []).flatMap((item) => collectNullableFields(item, prefix));
  const anyOf = (schema.anyOf ?? []).flatMap((item) => collectNullableFields(item, prefix));
  const items = schema.items ? collectNullableFields(schema.items, prefix ? `${prefix}[]` : "[]") : [];
  return [...current, ...nested, ...oneOf, ...anyOf, ...items];
}

function derivePagination(operation: UnknownRecord, capability?: CapabilityEntry): ContractPaginationMeta {
  const params = Array.isArray(operation.parameters) ? operation.parameters : [];
  const paramNames = new Set(
    params
      .filter((param): param is UnknownRecord => Boolean(param && typeof param === "object"))
      .map((param) => String(param.name ?? "").toLowerCase())
  );

  const capabilityPagination = capability?.pagination ?? {};
  const capabilitySupported = Boolean(capabilityPagination.supported);
  const pageParam = String(capabilityPagination.param ?? "") || (paramNames.has("page") ? "page" : undefined);
  const limitParam =
    String(capabilityPagination.sizeParam ?? "") ||
    (paramNames.has("limit") ? "limit" : paramNames.has("page_size") ? "page_size" : undefined);
  const cursorParam = String(capabilityPagination.cursorParam ?? "") || (paramNames.has("cursor") ? "cursor" : undefined);

  const supported = capabilitySupported || Boolean(pageParam || limitParam || cursorParam);
  return { supported, pageParam, limitParam, cursorParam };
}

function parseSecurityScopes(operation: UnknownRecord): string[] {
  const security = Array.isArray(operation.security) ? operation.security : [];
  const scopes = security.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [] as string[];
    return Object.values(entry as UnknownRecord).flatMap((value) =>
      Array.isArray(value) ? value.filter((scope): scope is string => typeof scope === "string") : []
    );
  });
  return scopes;
}

function buildCapabilityIndex(report: unknown): Map<string, CapabilityEntry> {
  const record = asRecord(report);
  const endpoints = Array.isArray(record.endpoints) ? record.endpoints : [];
  const index = new Map<string, CapabilityEntry>();

  for (const endpoint of endpoints) {
    if (!endpoint || typeof endpoint !== "object") continue;
    const item = endpoint as UnknownRecord;
    const method = normalizeMethod(String(item.method ?? "GET"));
    const route = String(item.route ?? item.path ?? "");
    if (!route) continue;
    const entry: CapabilityEntry = {
      method,
      route,
      authScope: Array.isArray(item.auth_scope)
        ? (item.auth_scope as string[])
        : typeof item.auth_scope === "string"
          ? item.auth_scope
          : undefined,
      capabilityTags: Array.isArray(item.capability_tags)
        ? (item.capability_tags as string[])
        : Array.isArray(item.tags)
          ? (item.tags as string[])
          : undefined,
      pagination: asRecord(item.pagination),
      retry: asRecord(item.retry),
      cache: asRecord(item.cache),
    };
    index.set(keyOf(method, route), entry);
  }

  return index;
}

function buildRegistry(openApiSource: unknown, capabilitySource: unknown) {
  const openApi = asRecord(openApiSource);
  const paths = asRecord(openApi.paths);
  const capabilityIndex = buildCapabilityIndex(capabilitySource);
  const registry = new Map<string, ContractRegistryEntry>();

  for (const [route, pathValue] of Object.entries(paths)) {
    const pathItem = asRecord(pathValue);
    for (const method of OPERATION_METHODS) {
      const operation = pathItem[method];
      if (!operation || typeof operation !== "object") continue;

      const normalizedMethod = normalizeMethod(method);
      const contractKey = keyOf(normalizedMethod, route);
      const operationRecord = operation as UnknownRecord;
      const capability = capabilityIndex.get(contractKey);
      const authScope = capability?.authScope
        ? Array.isArray(capability.authScope)
          ? capability.authScope
          : [capability.authScope]
        : parseSecurityScopes(operationRecord);
      const operationTags = Array.isArray(operationRecord.tags)
        ? operationRecord.tags.filter((tag): tag is string => typeof tag === "string")
        : [];
      const capabilityTags = capability?.capabilityTags ?? [];
      const requestSchema = extractRequestSchema(operationRecord);
      const responseSchema = extractResponseSchema(operationRecord);

      registry.set(contractKey, {
        key: contractKey,
        method: normalizedMethod,
        route,
        authScope,
        requestSchema,
        responseSchema,
        nullableFields: Array.from(new Set([
          ...collectNullableFields(requestSchema),
          ...collectNullableFields(responseSchema),
        ])),
        pagination: derivePagination(operationRecord, capability),
        retryCache: {
          retry: capability?.retry,
          cache: capability?.cache,
        },
        capabilityTags: Array.from(new Set([...operationTags, ...capabilityTags])),
      });
    }
  }

  return registry;
}

export const contractRegistry = buildRegistry(backendOpenApi, backendCapabilityReport);

export function getContractRegistryEntry(key: string): ContractRegistryEntry {
  const entry = contractRegistry.get(key);
  if (!entry) {
    throw new Error(`Unknown contract endpoint: ${key}`);
  }
  return entry;
}

export function hasContractRegistryEntry(key: string): boolean {
  return contractRegistry.has(key);
}
