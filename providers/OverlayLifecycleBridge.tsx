"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { closeTransientOverlays } from "@/lib/ui/modalLifecycle";

export default function OverlayLifecycleBridge() {
  const pathname = usePathname();
  const prevPathnameRef = useRef(pathname);
  const { authReady, authenticated } = useAuth();
  const prevAuthenticatedRef = useRef(authenticated);

  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      closeTransientOverlays("route-transition");
      prevPathnameRef.current = pathname;
    }
  }, [pathname]);

  useEffect(() => {
    if (!authReady) return;
    if (prevAuthenticatedRef.current && !authenticated) {
      closeTransientOverlays("auth-reset");
    }
    prevAuthenticatedRef.current = authenticated;
  }, [authReady, authenticated]);

  useEffect(() => {
    const onRuntimeError = () => closeTransientOverlays("error-boundary");
    window.addEventListener("error", onRuntimeError);
    window.addEventListener("unhandledrejection", onRuntimeError);
    return () => {
      window.removeEventListener("error", onRuntimeError);
      window.removeEventListener("unhandledrejection", onRuntimeError);
    };
  }, []);

  return null;
}
