export const API_BASE_URL = "/api/v2";
import { logDebug, logQueryTiming, warnDuplicateFetch } from "@/lib/utils/debugMetrics";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export interface ApiErrorMetadata {
  code?: string;
  details?: unknown;
  path?: string;
  method?: HttpMethod;
  retryable?: boolean;
}

export class ApiError extends Error {
  readonly code?: string;
  readonly details?: unknown;
  readonly path?: string;
  readonly method?: HttpMethod;
  readonly retryable: boolean;

  constructor(public readonly status: number, message: string, metadata: ApiErrorMetadata = {}) {
    super(message);
    this.name = "ApiError";
    this.code = metadata.code;
    this.details = metadata.details;
    this.path = metadata.path;
    this.method = metadata.method;
    this.retryable = Boolean(metadata.retryable);
  }
}

export interface NetworkErrorMetadata {
  path?: string;
  method?: HttpMethod;
  retryable?: boolean;
  cause?: unknown;
}

export class NetworkError extends Error {
  readonly path?: string;
  readonly method?: HttpMethod;
  readonly retryable: boolean;
  readonly cause?: unknown;

  constructor(message = "Network request failed", metadata: NetworkErrorMetadata = {}) {
    super(message);
    this.name = "NetworkError";
    this.path = metadata.path;
    this.method = metadata.method;
    this.retryable = metadata.retryable ?? true;
    this.cause = metadata.cause;
  }
}

export interface ApiClientRequestOptions extends Omit<RequestInit, "body" | "signal"> {
  body?: unknown;
  raw?: boolean;
  noRedirectOn401?: boolean;
  signal?: AbortSignal;
  retry?: number;
  dedupe?: boolean;
  cacheTtlMs?: number;
  cacheTags?: string[];
}

interface ApiClientConfig {
  baseUrl?: string;
  defaultRetry?: number;
  getAuthToken?: () => string | null;
  onUnauthorized?: () => void;
}

interface InflightEntry<T> {
  controller: AbortController;
  promise: Promise<T>;
  consumers: number;
}

interface CacheEntry {
  value: unknown;
  expiresAt: number;
  tags: string[];
}

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const RETRY_BASE_DELAY_MS = 250;
const RETRY_MAX_DELAY_MS = 5_000;
const DEFAULT_DEDUPE_CACHE_TTL_MS = 20_000;
const DEDUPE_ENDPOINTS = new Set([
  "/stocks/v2/bulk",
  "/mutual-funds/search",
  "/commodities/search",
  "/stocks/search",
]);
const ADMIN_READ_DEDUPE_PREFIXES = [
  "/clients/admin",
  "/assets/admin",
  "/dashboard/full",
  "/intelligence",
  "/insights",
  "/portfolio",
  "/holdings",
] as const;

function isMarketSearchDedupePath(pathname: string): boolean {
  return (
    pathname.endsWith("/mutual-funds/search") ||
    pathname.endsWith("/commodities/search") ||
    pathname.endsWith("/stocks/search")
  );
}

function isAdminReadDedupePath(pathname: string): boolean {
  return ADMIN_READ_DEDUPE_PREFIXES.some(
    (prefix) => pathname.endsWith(prefix) || pathname.includes(`${prefix}/`)
  );
}

function isBulkStockPost(method: HttpMethod, pathname: string): boolean {
  return method === "POST" && pathname.endsWith("/stocks/v2/bulk");
}

export const inflight = new Map<string, InflightEntry<unknown>>();
const responseCache = new Map<string, CacheEntry>();
const cacheTagIndex = new Map<string, Set<string>>();
const activeControllers = new Set<AbortController>();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getPathnameFromUrl(url: string): string {
  try {
    if (url.startsWith("http")) return new URL(url).pathname;
  } catch {}
  return url.split("?")[0];
}

function normalizeUrl(path: string, baseUrl: string): string {
  if (path.startsWith("http")) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return normalizedPath.startsWith(baseUrl) ? normalizedPath : `${baseUrl}${normalizedPath}`;
}

function dedupeKey(method: HttpMethod, url: string, body: unknown): string {
  const bodyKey = body === undefined ? "" : JSON.stringify(body);
  return `${method}::${url}::${bodyKey}`;
}

function shouldDedupeRequest(pathname: string, method: HttpMethod): boolean {
  // Bulk quote POST is read-only/idempotent in this frontend contract.
  if (isBulkStockPost(method, pathname)) return true;
  if (method !== "GET") return false;
  if (isAdminReadDedupePath(pathname)) return true;
  return isMarketSearchDedupePath(pathname);
}

function shouldUseShortCacheTtl(pathname: string, method: HttpMethod): boolean {
  if (isBulkStockPost(method, pathname)) return true;
  if (method !== "GET") return false;
  // Keep short cache TTL limited to market-search endpoints; admin endpoints use in-flight dedupe only (no TTL cache).
  return isMarketSearchDedupePath(pathname);
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof ApiError) return RETRYABLE_STATUS.has(error.status);
  if (error instanceof NetworkError) return error.retryable;
  return false;
}

function appendCacheTags(key: string, tags: string[]) {
  for (const tag of tags) {
    const existing = cacheTagIndex.get(tag) ?? new Set<string>();
    existing.add(key);
    cacheTagIndex.set(tag, existing);
  }
}

function removeCacheKey(key: string) {
  const cached = responseCache.get(key);
  if (!cached) return;
  for (const tag of cached.tags) {
    const entries = cacheTagIndex.get(tag);
    if (!entries) continue;
    entries.delete(key);
    if (entries.size === 0) cacheTagIndex.delete(tag);
  }
  responseCache.delete(key);
}

function consumeInflight<T>(entry: InflightEntry<T>, signal?: AbortSignal): Promise<T> {
  entry.consumers += 1;
  let released = false;

  const release = () => {
    if (released) return;
    released = true;
    entry.consumers -= 1;
    if (entry.consumers < 0) {
      const error = new Error("[api-client] inflight consumer tracking underflow");
      if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
        throw error;
      }
      entry.consumers = 0;
      if (typeof console !== "undefined" && typeof console.error === "function") {
        console.error(error);
      }
    }
    if (entry.consumers === 0) {
      entry.controller.abort();
    }
  };

  if (!signal) {
    return entry.promise.finally(release);
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = () => {
      release();
      reject(new DOMException("Aborted", "AbortError"));
    };

    if (signal.aborted) {
      onAbort();
      return;
    }

    signal.addEventListener("abort", onAbort, { once: true });

    entry.promise
      .then(resolve)
      .catch(reject)
      .finally(() => {
        signal.removeEventListener("abort", onAbort);
        release();
      });
  });
}

function extractApiMessage(payload: unknown, fallback: string): { message: string; code?: string; details?: unknown } {
  if (!payload || typeof payload !== "object") return { message: fallback };
  const record = payload as Record<string, unknown>;
  const message =
    (typeof record.message === "string" && record.message) ||
    (typeof record.error === "string" && record.error) ||
    (typeof record.detail === "string" && record.detail) ||
    (Array.isArray(record.detail) && record.detail.length > 0 && typeof record.detail[0] === "object"
      ? ((record.detail[0] as Record<string, unknown>).msg as string | undefined)
      : undefined) ||
    fallback;

  const code = typeof record.code === "string" ? record.code : undefined;
  const details = record.detail ?? record.details ?? undefined;
  return { message, code, details };
}

function unwrapJsonEnvelope<T>(json: unknown, status: number, raw?: boolean): T {
  if (json === undefined || json === null) return undefined as T;
  if (raw) return json as T;

  if (typeof json === "object" && json && "success" in json) {
    const envelope = json as Record<string, unknown>;
    if (envelope.success === false) {
      throw new ApiError(status, typeof envelope.error === "string" ? envelope.error : "API error");
    }
    if ("data" in envelope) return envelope.data as T;
  }

  if (typeof json === "object" && json && "data" in (json as Record<string, unknown>)) {
    return (json as Record<string, unknown>).data as T;
  }

  return json as T;
}

function defaultTagsForRequest(pathname: string, method: HttpMethod): string[] {
  const tags = [`endpoint:${pathname}`, `method:${method}`];
  for (const endpoint of DEDUPE_ENDPOINTS) {
    if (pathname.endsWith(endpoint)) {
      tags.push(`dedupe:${endpoint}`);
    }
  }
  return tags;
}

function toRequestBody(rawBody: unknown): { body: BodyInit | null | undefined; isJson: boolean } {
  if (rawBody === undefined || rawBody === null) return { body: undefined, isJson: false };
  if (typeof rawBody === "string") return { body: rawBody, isJson: false };
  if (typeof FormData !== "undefined" && rawBody instanceof FormData) return { body: rawBody, isJson: false };
  if (typeof URLSearchParams !== "undefined" && rawBody instanceof URLSearchParams) return { body: rawBody, isJson: false };
  if (typeof Blob !== "undefined" && rawBody instanceof Blob) return { body: rawBody, isJson: false };
  if (typeof ArrayBuffer !== "undefined" && rawBody instanceof ArrayBuffer) return { body: rawBody, isJson: false };
  if (typeof ReadableStream !== "undefined" && rawBody instanceof ReadableStream) return { body: rawBody, isJson: false };
  return { body: JSON.stringify(rawBody), isJson: true };
}

export function createApiClient(config: ApiClientConfig = {}) {
  const baseUrl = config.baseUrl ?? API_BASE_URL;
  const defaultRetry = config.defaultRetry ?? 2;

  async function executeRequest<T>(
    url: string,
    method: HttpMethod,
    requestPath: string,
    options: ApiClientRequestOptions,
    controller: AbortController
  ): Promise<T> {
    const startedAt =
      typeof performance !== "undefined" && typeof performance.now === "function"
        ? performance.now()
        : Date.now();
    const maxRetries = options.retry ?? defaultRetry;
    const bodyData = toRequestBody(options.body);
    const body = bodyData.body;

    const baseHeaders = new Headers(options.headers ?? {});
    if (!baseHeaders.has("Accept")) baseHeaders.set("Accept", "application/json");
    if (!baseHeaders.has("Content-Type") && bodyData.isJson) baseHeaders.set("Content-Type", "application/json");

    const token = config.getAuthToken?.();
    if (token && !baseHeaders.has("Authorization")) {
      baseHeaders.set("Authorization", `Bearer ${token}`);
    }

    let attempt = 0;
    while (true) {
      activeControllers.add(controller);
      try {
        const response = await fetch(url, {
          ...options,
          method,
          headers: baseHeaders,
          body,
          signal: controller.signal,
          credentials: options.credentials ?? "include",
        });

        if (response.status === 401) {
          if (!options.noRedirectOn401) config.onUnauthorized?.();
          throw new ApiError(401, "Session expired", { path: requestPath, method, retryable: false });
        }

        if (!response.ok) {
          let payload: unknown;
          try {
            payload = await response.json();
          } catch {
            payload = undefined;
          }
          const extracted = extractApiMessage(payload, `HTTP ${response.status}`);
          throw new ApiError(response.status, extracted.message, {
            code: extracted.code,
            details: extracted.details,
            path: requestPath,
            method,
            retryable: RETRYABLE_STATUS.has(response.status),
          });
        }

        if (response.status === 204) return undefined as T;

        let json: unknown;
        try {
          json = await response.json();
        } catch {
          json = undefined;
        }

        const duration =
          typeof performance !== "undefined" && typeof performance.now === "function"
            ? performance.now() - startedAt
            : Date.now() - startedAt;
        if (typeof window !== "undefined") {
          console.info("[perf]", {
            type: "query-timing",
            method,
            path: requestPath,
            status: "ok",
            durationMs: Number(duration.toFixed(2)),
          });
        }
        logQueryTiming([method, requestPath], Number(duration.toFixed(2)));
        return unwrapJsonEnvelope<T>(json, response.status, options.raw);
      } catch (error) {
        const duration =
          typeof performance !== "undefined" && typeof performance.now === "function"
            ? performance.now() - startedAt
            : Date.now() - startedAt;

        if (error instanceof DOMException && error.name === "AbortError") {
          throw error;
        }

        const normalizedError =
          error instanceof ApiError || error instanceof NetworkError
            ? error
            : new NetworkError("Unable to reach backend API", {
                cause: error,
                path: requestPath,
                method,
                retryable: true,
              });

        const isFinalFailure = attempt >= maxRetries || !isRetryableError(normalizedError);
        if (typeof window !== "undefined" && isFinalFailure) {
          console.warn("[perf]", {
            type: "query-timing",
            method,
            path: requestPath,
            status: "error",
            durationMs: Number(duration.toFixed(2)),
            attempt,
          }, normalizedError);
        }
        if (isFinalFailure) {
          logQueryTiming([method, requestPath], Number(duration.toFixed(2)));
        }

        if (isFinalFailure) {
          throw normalizedError;
        }
        const delayMs = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
        await sleep(delayMs);
        attempt += 1;
      } finally {
        activeControllers.delete(controller);
      }
    }
  }

  async function request<T>(path: string, options: ApiClientRequestOptions = {}): Promise<T> {
    const method = String(options.method ?? "GET").toUpperCase() as HttpMethod;
    const url = normalizeUrl(path, baseUrl);
    const requestPath = getPathnameFromUrl(url);
    const key = dedupeKey(method, url, options.body);
    const dedupeEligible = shouldDedupeRequest(requestPath, method);
    const shortCacheEligible = shouldUseShortCacheTtl(requestPath, method);
    const cacheTtlMs =
      options.cacheTtlMs ??
      (shortCacheEligible ? DEFAULT_DEDUPE_CACHE_TTL_MS : 0);
    const useDedupe = options.dedupe ?? dedupeEligible;

    if (cacheTtlMs > 0) {
      const cached = responseCache.get(key);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.value as T;
      }
      if (cached && cached.expiresAt <= Date.now()) {
        removeCacheKey(key);
      }
    }

    if (useDedupe) {
      const existing = inflight.get(key) as InflightEntry<T> | undefined;
      if (existing) {
        warnDuplicateFetch([method, requestPath]);
        logDebug("query", "dedupe-hit", { method, path: requestPath });
        return consumeInflight(existing, options.signal);
      }
    }

    const controller = new AbortController();
    const job = executeRequest<T>(url, method, requestPath, options, controller)
      .then((value) => {
        if (cacheTtlMs > 0) {
          const tags = [...new Set([...(options.cacheTags ?? []), ...defaultTagsForRequest(requestPath, method)])];
          removeCacheKey(key);
          responseCache.set(key, {
            value,
            expiresAt: Date.now() + cacheTtlMs,
            tags,
          });
          appendCacheTags(key, tags);
        }
        return value;
      })
      .catch((error) => {
        logDebug("query", "request-failure", {
          method,
          path: requestPath,
          message: error instanceof Error ? error.message : String(error),
        });
        throw error;
      })
      .finally(() => {
        if (useDedupe) inflight.delete(key);
      });

    if (useDedupe) {
      const entry: InflightEntry<T> = { controller, promise: job, consumers: 0 };
      inflight.set(key, entry as InflightEntry<unknown>);
      return consumeInflight(entry, options.signal);
    }

    if (options.signal) {
      if (options.signal.aborted) controller.abort();
      else options.signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
    return job;
  }

  function invalidateCacheTags(tags: string[]) {
    for (const tag of tags) {
      const keys = cacheTagIndex.get(tag);
      if (!keys) continue;
      for (const key of keys) {
        removeCacheKey(key);
      }
      cacheTagIndex.delete(tag);
    }
  }

  return {
    request,
    invalidateCacheTags,
  };
}

export function abortAllRequests() {
  for (const entry of inflight.values()) {
    entry.controller.abort();
  }
  inflight.clear();
  for (const controller of activeControllers) {
    controller.abort();
  }
  activeControllers.clear();
}

export function clearApiClientCaches() {
  inflight.clear();
  responseCache.clear();
  cacheTagIndex.clear();
}
