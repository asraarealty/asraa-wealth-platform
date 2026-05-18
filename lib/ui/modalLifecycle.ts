"use client";

import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";

type OverlayType = "modal" | "drawer" | "overlay";
export type OverlayCloseReason =
  | "escape"
  | "backdrop"
  | "cancel"
  | "route-transition"
  | "auth-reset"
  | "error-boundary"
  | "programmatic";

interface OverlayEntry {
  id: number;
  type: OverlayType;
  closeOnEscape: boolean;
  closeOnRouteTransition: boolean;
  closeOnAuthReset: boolean;
  closeOnErrorBoundary: boolean;
  lockBodyScroll: boolean;
  openedAt: number;
  closing: boolean;
  repeatedCloseAttempts: number;
  closeReason: OverlayCloseReason | null;
  onClose: () => void;
}

interface OverlayRegistration {
  id: number;
  requestClose: (reason?: OverlayCloseReason) => boolean;
  unregister: () => void;
}

interface OverlayLifecycleOptions {
  open: boolean;
  onClose: () => void;
  type?: OverlayType;
  lockBodyScroll?: boolean;
  closeOnEscape?: boolean;
  closeOnRouteTransition?: boolean;
  closeOnAuthReset?: boolean;
  closeOnErrorBoundary?: boolean;
}

type OverlaySnapshot = { count: number; ids: number[] };
type OverlayDebugWindow = Window & { __ASRAA_OVERLAY_DEBUG?: boolean };
type OverlayLifecycleContext = {
  providerMountCount: number;
  lastLifecycleEvent: string | null;
  lastLifecycleEventAt: number | null;
  lastCloseReason: OverlayCloseReason | null;
  lastCleanupSource: string | null;
  routeTransitionSource: string | null;
};

let overlaySequence = 0;
let overlays: OverlayEntry[] = [];
const snapshotListeners = new Set<() => void>();
let overlaySnapshot: OverlaySnapshot = { count: 0, ids: [] };
const transientCloseInProgress = new Set<"route-transition" | "auth-reset" | "error-boundary">();
const overlayLifecycleContext: OverlayLifecycleContext = {
  providerMountCount: 0,
  lastLifecycleEvent: null,
  lastLifecycleEventAt: null,
  lastCloseReason: null,
  lastCleanupSource: null,
  routeTransitionSource: null,
};

let bodyLockCount = 0;
let previousBodyOverflow = "";
let previousBodyPaddingRight = "";
let previousBodyTouchAction = "";
let previousBodyOverscrollBehavior = "";

let escapeListenerAttached = false;

function telemetry(event: string, payload: Record<string, unknown> = {}) {
  overlayLifecycleContext.lastLifecycleEvent = event;
  overlayLifecycleContext.lastLifecycleEventAt = Date.now();
  if (typeof payload.reason === "string") {
    overlayLifecycleContext.lastCloseReason = payload.reason as OverlayCloseReason;
  }
  if (typeof payload.cleanupSource === "string") {
    overlayLifecycleContext.lastCleanupSource = payload.cleanupSource;
  }
  if (typeof payload.routeTransitionSource === "string") {
    overlayLifecycleContext.routeTransitionSource = payload.routeTransitionSource;
  }
  if (typeof window === "undefined") return;
  const debugEnabled =
    process.env.NODE_ENV !== "production" ||
    (window as OverlayDebugWindow).__ASRAA_OVERLAY_DEBUG === true;
  if (!debugEnabled) return;
  console.info("[overlay-lifecycle]", { event, ...payload });
}

function notifySnapshot() {
  overlaySnapshot = { count: overlays.length, ids: overlays.map((entry) => entry.id) };
  snapshotListeners.forEach((listener) => listener());
}

function getSnapshot(): OverlaySnapshot {
  return overlaySnapshot;
}

function subscribeSnapshot(listener: () => void) {
  snapshotListeners.add(listener);
  return () => snapshotListeners.delete(listener);
}

function applyBodyLock() {
  if (typeof document === "undefined") return;
  const body = document.body;
  const root = document.documentElement;
  const scrollbarWidth = Math.max(0, window.innerWidth - root.clientWidth);
  previousBodyOverflow = body.style.overflow;
  previousBodyPaddingRight = body.style.paddingRight;
  previousBodyTouchAction = body.style.touchAction;
  previousBodyOverscrollBehavior = body.style.overscrollBehavior;
  body.style.overflow = "hidden";
  body.style.touchAction = "none";
  body.style.overscrollBehavior = "contain";
  if (scrollbarWidth > 0) {
    body.style.paddingRight = `${scrollbarWidth}px`;
  }
  body.dataset.overlayLock = "true";
}

function clearBodyLock() {
  if (typeof document === "undefined") return;
  const body = document.body;
  body.style.overflow = previousBodyOverflow;
  body.style.paddingRight = previousBodyPaddingRight;
  body.style.touchAction = previousBodyTouchAction;
  body.style.overscrollBehavior = previousBodyOverscrollBehavior;
  delete body.dataset.overlayLock;
}

function detectAndFixStuckBodyLock(trigger: string) {
  if (typeof document === "undefined") return;
  if (bodyLockCount > 0 || overlays.some((entry) => entry.lockBodyScroll)) return;
  if (document.body.style.overflow === "hidden") {
    telemetry("stuck-lock-detected", { trigger });
    clearBodyLock();
  }
}

function acquireBodyLock() {
  if (typeof document === "undefined") return () => {};
  if (bodyLockCount === 0) {
    applyBodyLock();
  }
  bodyLockCount += 1;
  telemetry("body-lock-acquired", { count: bodyLockCount });

  let released = false;
  return () => {
    if (released) return;
    released = true;
    bodyLockCount = Math.max(0, bodyLockCount - 1);
    if (bodyLockCount === 0) {
      clearBodyLock();
    }
    detectAndFixStuckBodyLock("release");
    telemetry("body-lock-released", { count: bodyLockCount });
  };
}

function findOverlay(id: number) {
  return overlays.find((entry) => entry.id === id) ?? null;
}

function requestOverlayClose(entry: OverlayEntry, reason: OverlayCloseReason) {
  if (entry.closing) {
    entry.repeatedCloseAttempts += 1;
    telemetry("repeated-close-ignored", {
      id: entry.id,
      type: entry.type,
      reason,
      activeCloseReason: entry.closeReason,
      attempts: entry.repeatedCloseAttempts,
    });
    return false;
  }
  entry.closing = true;
  entry.closeReason = reason;
  entry.repeatedCloseAttempts = 0;

  try {
    telemetry("close-requested", { id: entry.id, type: entry.type, reason });
    entry.onClose();
    return true;
  } catch (error) {
    entry.closing = false;
    entry.closeReason = null;
    telemetry("cleanup-failure", {
      id: entry.id,
      type: entry.type,
      reason,
      message: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

function onEscapeKey(event: KeyboardEvent) {
  if (event.key !== "Escape") return;
  const topClosable = [...overlays].reverse().find((entry) => entry.closeOnEscape);
  if (!topClosable) return;
  event.preventDefault();
  requestOverlayClose(topClosable, "escape");
}

function syncEscapeListener() {
  if (typeof document === "undefined") return;
  const needsListener = overlays.some((entry) => entry.closeOnEscape);
  if (needsListener && !escapeListenerAttached) {
    document.addEventListener("keydown", onEscapeKey);
    escapeListenerAttached = true;
    return;
  }
  if (!needsListener && escapeListenerAttached) {
    document.removeEventListener("keydown", onEscapeKey);
    escapeListenerAttached = false;
  }
}

function registerOverlay({
  type,
  onClose,
  lockBodyScroll,
  closeOnEscape,
  closeOnRouteTransition,
  closeOnAuthReset,
  closeOnErrorBoundary,
}: {
  type: OverlayType;
  onClose: () => void;
  lockBodyScroll: boolean;
  closeOnEscape: boolean;
  closeOnRouteTransition: boolean;
  closeOnAuthReset: boolean;
  closeOnErrorBoundary: boolean;
}): OverlayRegistration {
  const id = ++overlaySequence;
  const entry: OverlayEntry = {
    id,
    type,
    closeOnEscape,
    closeOnRouteTransition,
    closeOnAuthReset,
    closeOnErrorBoundary,
    lockBodyScroll,
    openedAt: Date.now(),
    closing: false,
    repeatedCloseAttempts: 0,
    closeReason: null,
    onClose,
  };

  overlays = [...overlays, entry];
  const releaseBodyLock = lockBodyScroll ? acquireBodyLock() : () => {};
  syncEscapeListener();
  notifySnapshot();
  telemetry("overlay-opened", { id, type, count: overlays.length });

  let unregistered = false;
  return {
    id,
    requestClose: (reason = "programmatic") => {
      const current = findOverlay(id);
      if (!current) return false;
      return requestOverlayClose(current, reason);
    },
    unregister: () => {
      if (unregistered) return;
      unregistered = true;

      const existing = findOverlay(id);
      if (!existing) return;
      overlays = overlays.filter((overlay) => overlay.id !== id);
      releaseBodyLock();
      syncEscapeListener();
      notifySnapshot();
      telemetry("overlay-closed", {
        id,
        type: existing.type,
        reason: existing.closeReason ?? "programmatic",
        count: overlays.length,
        openDurationMs: Date.now() - existing.openedAt,
      });
      detectAndFixStuckBodyLock("overlay-unregister");
    },
  };
}

export function closeTransientOverlays(reason: "route-transition" | "auth-reset" | "error-boundary") {
  if (transientCloseInProgress.has(reason)) {
    telemetry("batch-close-reentrant-ignored", { reason });
    return;
  }
  const shouldClose =
    reason === "route-transition"
      ? (entry: OverlayEntry) => entry.closeOnRouteTransition
      : reason === "auth-reset"
      ? (entry: OverlayEntry) => entry.closeOnAuthReset
      : (entry: OverlayEntry) => entry.closeOnErrorBoundary;

  const queue = [...overlays].reverse().filter(shouldClose);
  if (queue.length === 0) return;
  transientCloseInProgress.add(reason);
  overlayLifecycleContext.lastCleanupSource = reason;
  telemetry("batch-close-start", { reason, count: queue.length, cleanupSource: reason });
  try {
    queue.forEach((entry) => {
      requestOverlayClose(entry, reason);
    });
  } finally {
    transientCloseInProgress.delete(reason);
    telemetry("batch-close-end", { reason, count: queue.length, cleanupSource: reason });
  }
}

export function useOverlayLifecycle({
  open,
  onClose,
  type = "modal",
  lockBodyScroll = true,
  closeOnEscape = true,
  closeOnRouteTransition = true,
  closeOnAuthReset = true,
  closeOnErrorBoundary = true,
}: OverlayLifecycleOptions) {
  const onCloseRef = useRef(onClose);
  const registrationRef = useRef<OverlayRegistration | null>(null);
  const overlayIdRef = useRef<number | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      const activeRegistration = registrationRef.current;
      registrationRef.current = null;
      overlayIdRef.current = null;
      activeRegistration?.unregister();
      return;
    }

    const registration = registerOverlay({
      type,
      lockBodyScroll,
      closeOnEscape,
      closeOnRouteTransition,
      closeOnAuthReset,
      closeOnErrorBoundary,
      onClose: () => onCloseRef.current(),
    });
    registrationRef.current = registration;
    overlayIdRef.current = registration.id;

    return () => {
      if (registrationRef.current?.id === registration.id) {
        registrationRef.current = null;
        overlayIdRef.current = null;
      }
      registration.unregister();
    };
  }, [
    open,
    type,
    lockBodyScroll,
    closeOnEscape,
    closeOnRouteTransition,
    closeOnAuthReset,
    closeOnErrorBoundary,
  ]);

  const snapshot = useSyncExternalStore(subscribeSnapshot, getSnapshot, getSnapshot);

  const stackIndex = useMemo(() => {
    if (overlayIdRef.current === null) return -1;
    return snapshot.ids.indexOf(overlayIdRef.current);
  }, [snapshot]);

  const isTopMost = stackIndex >= 0 && stackIndex === snapshot.ids.length - 1;

  const requestClose = useCallback((reason: OverlayCloseReason = "programmatic") => {
    const registration = registrationRef.current;
    if (!registration) {
      telemetry("close-ignored-no-registration", { reason });
      return false;
    }
    return registration.requestClose(reason);
  }, []);

  return {
    requestClose,
    overlayCount: snapshot.count,
    overlayId: overlayIdRef.current,
    stackIndex,
    isTopMost,
  };
}

export function lockBodyScroll() {
  return acquireBodyLock();
}

export function useBodyScrollLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    return lockBodyScroll();
  }, [enabled]);
}

export function useAbortSafeLifecycle(active = true) {
  const activeRef = useRef(active);
  const abortControllerRef = useRef<AbortController>(new AbortController());

  useEffect(() => {
    activeRef.current = active;
    if (!active) {
      if (!abortControllerRef.current.signal.aborted) {
        abortControllerRef.current.abort();
      }
      return;
    }
    if (abortControllerRef.current.signal.aborted) {
      abortControllerRef.current = new AbortController();
    }
  }, [active]);

  useEffect(
    () => () => {
      activeRef.current = false;
      if (!abortControllerRef.current.signal.aborted) {
        abortControllerRef.current.abort();
      }
    },
    []
  );

  return {
    signal: abortControllerRef.current.signal,
    isActive: () => activeRef.current && !abortControllerRef.current.signal.aborted,
  };
}

export function setOverlayLifecycleContext(
  context: Partial<Pick<OverlayLifecycleContext, "providerMountCount" | "lastCleanupSource" | "routeTransitionSource">>
) {
  if (typeof context.providerMountCount === "number") {
    overlayLifecycleContext.providerMountCount = Math.max(0, context.providerMountCount);
  }
  if (typeof context.lastCleanupSource === "string") {
    overlayLifecycleContext.lastCleanupSource = context.lastCleanupSource;
  }
  if (typeof context.routeTransitionSource === "string") {
    overlayLifecycleContext.routeTransitionSource = context.routeTransitionSource;
  }
}

export function getOverlayLifecycleDiagnostics() {
  return {
    activeOverlayCount: overlays.length,
    activeOverlayIds: overlays.map((entry) => entry.id),
    providerMountCount: overlayLifecycleContext.providerMountCount,
    lastLifecycleEvent: overlayLifecycleContext.lastLifecycleEvent,
    lastLifecycleEventAt: overlayLifecycleContext.lastLifecycleEventAt,
    lastCloseReason: overlayLifecycleContext.lastCloseReason,
    lastCleanupSource: overlayLifecycleContext.lastCleanupSource,
    routeTransitionSource: overlayLifecycleContext.routeTransitionSource,
  };
}
