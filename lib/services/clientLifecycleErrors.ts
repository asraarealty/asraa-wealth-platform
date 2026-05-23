import { ApiError, NetworkError, toErrorMessage } from "@/lib/fetcher";

export type LifecycleErrorAction = "approve" | "suspend" | "archive" | "restore" | "delete";

const GENERIC_ERROR_PATTERN = /^(HTTP \d{3}|Request failed \(\d{3}\)|API error)$/i;

const STATUS_FALLBACK_MESSAGES: Record<number, Record<LifecycleErrorAction, string>> = {
  422: {
    approve: "Unable to complete this lifecycle action right now. Please verify the client state and try again.",
    suspend: "Unable to complete this lifecycle action right now. Please verify the client state and try again.",
    archive: "Unable to archive this client right now. Please verify the client state and try again.",
    restore: "Unable to restore this client right now. Please verify the client state and try again.",
    delete: "Unable to permanently delete this client right now. Please verify the client is archived and try again.",
  },
  409: {
    approve: "Client state changed before this action completed. Refresh and try again.",
    suspend: "Client state changed before this action completed. Refresh and try again.",
    archive: "Client state changed before this action completed. Refresh and try again.",
    restore: "Client state changed before this action completed. Refresh and try again.",
    delete: "Client state changed before this action completed. Refresh and try again.",
  },
  500: {
    approve: "Server error while updating client lifecycle. Please try again shortly.",
    suspend: "Server error while updating client lifecycle. Please try again shortly.",
    archive: "Server error while archiving client. Please try again shortly.",
    restore: "Server error while restoring client. Please try again shortly.",
    delete: "Server error while permanently deleting client. Please try again shortly.",
  },
};

function hasSpecificBackendMessage(message: string) {
  const trimmed = message.trim();
  return Boolean(trimmed) && !GENERIC_ERROR_PATTERN.test(trimmed);
}

export function toLifecycleErrorMessage(error: unknown, action: LifecycleErrorAction): string {
  if (error instanceof NetworkError) {
    return "Unable to reach backend API";
  }
  if (error instanceof ApiError) {
    if (hasSpecificBackendMessage(error.message)) return error.message.trim();
    return STATUS_FALLBACK_MESSAGES[error.status]?.[action] ?? `Request failed (${error.status})`;
  }
  const message = toErrorMessage(error);
  if (hasSpecificBackendMessage(message)) return message.trim();
  return "Something went wrong";
}
