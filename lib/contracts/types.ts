export type ContractHttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export interface ContractSchema {
  type?: string;
  required?: string[];
  properties?: Record<string, ContractSchema>;
  enum?: unknown[];
  nullable?: boolean;
  items?: ContractSchema;
  oneOf?: ContractSchema[];
  anyOf?: ContractSchema[];
}

export interface ContractPaginationMeta {
  supported: boolean;
  pageParam?: string;
  limitParam?: string;
  cursorParam?: string;
}

export interface ContractRetryCacheMeta {
  retry?: Record<string, unknown>;
  cache?: Record<string, unknown>;
}

export interface ContractRegistryEntry {
  key: string;
  method: ContractHttpMethod;
  route: string;
  authScope: string[];
  requestSchema?: ContractSchema;
  responseSchema?: ContractSchema;
  nullableFields: string[];
  pagination: ContractPaginationMeta;
  retryCache: ContractRetryCacheMeta;
  capabilityTags: string[];
}
