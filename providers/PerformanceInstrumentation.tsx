"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function PerformanceInstrumentation() {
  const pathname = usePathname();
  const lastPathRef = useRef(pathname);
  const lastRouteChangeAt = useRef<number | null>(null);

  useEffect(() => {
    if (typeof performance === "undefined") return;
    const now = performance.now();
    const hydrationMs = Number(now.toFixed(2));
    console.info("[perf]", { type: "hydration-timing", durationMs: hydrationMs });
    console.info("[perf]", { type: "component-mount", component: "root-layout", atMs: hydrationMs });
  }, []);

  useEffect(() => {
    if (typeof performance === "undefined") return;

    const now = performance.now();
    if (lastPathRef.current !== pathname) {
      const duration =
        lastRouteChangeAt.current == null
          ? 0
          : Number((now - lastRouteChangeAt.current).toFixed(2));
      console.info("[perf]", {
        type: "route-transition",
        from: lastPathRef.current,
        to: pathname,
        durationMs: duration,
      });
      lastRouteChangeAt.current = now;
      lastPathRef.current = pathname;
      return;
    }

    lastRouteChangeAt.current = now;
  }, [pathname]);

  return null;
}

