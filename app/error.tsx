"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getOverlayLifecycleDiagnostics } from "@/lib/ui/modalLifecycle";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();

  useEffect(() => {
    const diagnostics = getOverlayLifecycleDiagnostics();
    console.error("[runtime-error-boundary]", {
      message: error?.message ?? "Unknown error",
      digest: error?.digest,
      pathname,
      overlay: diagnostics,
    });
  }, [error, pathname]);

  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-3xl flex-col items-center justify-center gap-4 px-4 text-center text-white">
      <h2 className="text-2xl font-semibold">Something went wrong</h2>
      <p className="text-sm text-slate-300">
        {error?.message || "A runtime error occurred. You can continue by retrying this view."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-xl bg-sky-400 px-4 py-2 text-sm font-semibold text-[#04102a]"
      >
        Retry
      </button>
    </div>
  );
}
