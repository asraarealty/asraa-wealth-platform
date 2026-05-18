"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { closeTransientOverlays, setOverlayLifecycleContext } from "@/lib/ui/modalLifecycle";

const bridgeInstances = new Set<number>();
let bridgeSequence = 0;

export default function OverlayLifecycleBridge() {
  const pathname = usePathname();
  const prevPathnameRef = useRef(pathname);
  const { authReady, authenticated } = useAuth();
  const prevAuthenticatedRef = useRef(authenticated);
  const isMountedRef = useRef(false);
  const instanceIdRef = useRef(0);

  if (instanceIdRef.current === 0) {
    bridgeSequence += 1;
    instanceIdRef.current = bridgeSequence;
  }

  useEffect(() => {
    if (isMountedRef.current) return;
    isMountedRef.current = true;
    bridgeInstances.add(instanceIdRef.current);
    setOverlayLifecycleContext({
      providerMountCount: bridgeInstances.size,
      lastCleanupSource: "overlay-provider-mount",
    });
    return () => {
      if (!isMountedRef.current) return;
      isMountedRef.current = false;
      bridgeInstances.delete(instanceIdRef.current);
      setOverlayLifecycleContext({
        providerMountCount: bridgeInstances.size,
        lastCleanupSource: "overlay-provider-unmount",
      });
    };
  }, []);

  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      setOverlayLifecycleContext({
        routeTransitionSource: `${String(prevPathnameRef.current ?? "")}->${String(pathname ?? "")}`,
        lastCleanupSource: "route-transition",
      });
      closeTransientOverlays("route-transition");
      prevPathnameRef.current = pathname;
    }
  }, [pathname]);

  useEffect(() => {
    if (!authReady) return;
    if (prevAuthenticatedRef.current && !authenticated) {
      setOverlayLifecycleContext({ lastCleanupSource: "auth-reset" });
      closeTransientOverlays("auth-reset");
    }
    prevAuthenticatedRef.current = authenticated;
  }, [authReady, authenticated]);

  useEffect(() => {
    const onRuntimeError = () => {
      setOverlayLifecycleContext({ lastCleanupSource: "runtime-error" });
      closeTransientOverlays("error-boundary");
    };
    window.addEventListener("error", onRuntimeError);
    window.addEventListener("unhandledrejection", onRuntimeError);
    return () => {
      window.removeEventListener("error", onRuntimeError);
      window.removeEventListener("unhandledrejection", onRuntimeError);
    };
  }, []);

  return null;
}
