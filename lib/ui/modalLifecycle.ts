"use client";

import { useEffect } from "react";

let bodyLockCount = 0;
let previousOverflow = "";

export function lockBodyScroll() {
  if (typeof document === "undefined") return () => {};

  if (bodyLockCount === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  bodyLockCount += 1;

  return () => {
    bodyLockCount = Math.max(0, bodyLockCount - 1);
    if (bodyLockCount === 0) {
      document.body.style.overflow = previousOverflow;
    }
  };
}

export function useBodyScrollLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    return lockBodyScroll();
  }, [enabled]);
}

