'use client';

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body className="min-h-screen flex items-center justify-center p-4 bg-[#050b18] text-white">
        <div className="glass-card rounded-2xl border border-red-400/25 p-6 max-w-md w-full text-center">
          <h2 className="text-lg font-semibold">Unexpected application error</h2>
          <p className="text-sm text-white/60 mt-2">
            We could not complete this request. Please retry.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-4 rounded-lg border border-white/20 px-3.5 py-2 text-sm text-white/90"
          >
            Retry
          </button>
        </div>
      </body>
    </html>
  );
}
