import { ApiError, toErrorMessage } from "@/lib/fetcher";

const DETAIL_META_KEYS = new Set([
  "msg",
  "message",
  "error",
  "detail",
  "details",
  "errors",
  "loc",
  "path",
  "field",
  "param",
  "type",
  "ctx",
]);

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function toFieldPath(value: unknown): string | null {
  if (Array.isArray(value)) {
    const parts = value
      .map((part) => (typeof part === "string" || typeof part === "number" ? String(part).trim() : ""))
      .filter((part) => Boolean(part) && !["body", "query", "path"].includes(part.toLowerCase()));
    return parts.length > 0 ? parts.join(".") : null;
  }
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function collectValidationMessages(value: unknown, fieldHint?: string): string[] {
  if (value == null) return [];

  if (typeof value === "string") {
    const message = value.trim();
    if (!message) return [];
    return fieldHint ? [`${fieldHint}: ${message}`] : [message];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectValidationMessages(entry, fieldHint));
  }

  const record = asRecord(value);
  const field =
    toFieldPath(record.loc) ??
    toFieldPath(record.path) ??
    toFieldPath(record.field) ??
    toFieldPath(record.param) ??
    fieldHint ??
    undefined;
  const directMessage =
    (typeof record.msg === "string" && record.msg.trim()) ||
    (typeof record.message === "string" && record.message.trim()) ||
    (typeof record.error === "string" && record.error.trim()) ||
    "";

  const direct = directMessage ? (field ? [`${field}: ${directMessage}`] : [directMessage]) : [];
  const nested = [
    ...collectValidationMessages(record.detail, field),
    ...collectValidationMessages(record.details, field),
    ...collectValidationMessages(record.errors, field),
  ];

  const extra = Object.entries(record).flatMap(([key, nestedValue]) => {
    if (DETAIL_META_KEYS.has(key)) {
      return [];
    }
    return collectValidationMessages(nestedValue, field ?? key);
  });

  return [...direct, ...nested, ...extra];
}

export function toApiValidationErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return toErrorMessage(error);

  const messages = Array.from(
    new Set(
      collectValidationMessages(error.details)
        .map((message) => message.trim())
        .filter(Boolean)
    )
  );

  if (messages.length > 0) return messages.join(" · ");

  const fallback = toErrorMessage(error).trim();
  const normalized = fallback.toLowerCase();
  const genericFallback = `Request failed (${error.status})`;
  if (
    normalized === "validation failed" ||
    normalized === "api error" ||
    /^http \d{3}$/i.test(fallback) ||
    /^request failed \(\d{3}\)$/i.test(fallback)
  ) {
    return genericFallback;
  }
  return fallback || genericFallback;
}
