"use client";

export interface AuthLifecycleState {
  authReady: boolean;
  sessionHydrated: boolean;
  authenticated: boolean;
  isRefreshing: boolean;
  refreshPromise: Promise<string> | null;
}

export interface AuthTelemetryEvent {
  type:
    | "hydration"
    | "refresh"
    | "refresh-failed"
    | "auth-failure"
    | "redirect-loop"
    | "unauthorized-burst";
  durationMs?: number;
  count?: number;
  reason?: string;
}

const state: AuthLifecycleState = {
  authReady: false,
  sessionHydrated: false,
  authenticated: false,
  isRefreshing: false,
  refreshPromise: null,
};

const listeners = new Set<(value: AuthLifecycleState) => void>();

let unauthorizedBurst = 0;
let unauthorizedBurstStartedAt = 0;
let telemetryReporter: ((event: AuthTelemetryEvent) => void) | null = null;
let authFailureHandler: ((reason: string) => void | Promise<void>) | null = null;

function emit() {
  const snapshot = getAuthLifecycleSnapshot();
  for (const listener of listeners) listener(snapshot);
}

export function getAuthLifecycleSnapshot(): AuthLifecycleState {
  return { ...state };
}

export function setAuthLifecycleState(patch: Partial<AuthLifecycleState>) {
  Object.assign(state, patch);
  emit();
}

export function subscribeAuthLifecycle(
  listener: (value: AuthLifecycleState) => void
): () => void {
  listeners.add(listener);
  listener(getAuthLifecycleSnapshot());
  return () => listeners.delete(listener);
}

export function setAuthTelemetryReporter(
  reporter: ((event: AuthTelemetryEvent) => void) | null
) {
  telemetryReporter = reporter;
}

export function reportAuthTelemetry(event: AuthTelemetryEvent) {
  telemetryReporter?.(event);
}

export function setAuthFailureHandler(
  handler: ((reason: string) => void | Promise<void>) | null
) {
  authFailureHandler = handler;
}

export function notifyAuthFailure(reason: string) {
  reportAuthTelemetry({ type: "auth-failure", reason });
  void authFailureHandler?.(reason);
}

export function noteUnauthorizedRequest() {
  const now = Date.now();
  if (unauthorizedBurstStartedAt === 0 || now - unauthorizedBurstStartedAt > 12_000) {
    unauthorizedBurstStartedAt = now;
    unauthorizedBurst = 0;
  }
  unauthorizedBurst += 1;
  if (unauthorizedBurst >= 3) {
    reportAuthTelemetry({
      type: "unauthorized-burst",
      count: unauthorizedBurst,
    });
  }
}

export function resetUnauthorizedBurstCounter() {
  unauthorizedBurst = 0;
  unauthorizedBurstStartedAt = 0;
}

export async function runWithGlobalRefresh<T>(
  task: () => Promise<T>
): Promise<T> {
  if (state.refreshPromise) {
    return state.refreshPromise as unknown as Promise<T>;
  }

  const refreshPromise = task().finally(() => {
    setAuthLifecycleState({
      isRefreshing: false,
      refreshPromise: null,
    });
  });

  setAuthLifecycleState({
    isRefreshing: true,
    refreshPromise: refreshPromise as unknown as Promise<string>,
  });

  return refreshPromise;
}
