"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#07080d] text-white">
        <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-4 px-4 text-center">
          <h1 className="text-2xl font-semibold">App recovery mode</h1>
          <p className="text-sm text-slate-300">
            {error?.message || "An unexpected error occurred. Reload this section to continue."}
          </p>
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-sky-400 px-4 py-2 text-sm font-semibold text-[#04102a]"
          >
            Reload
          </button>
        </main>
      </body>
    </html>
  );
}

