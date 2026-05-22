"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const REQUESTED_UPLOADS = [
  "CAS statements",
  "Broker PDFs",
  "Screenshots",
  "Property documents",
  "Excel holdings",
  "Rent records",
] as const;

export default function OnboardingPage() {
  const [queuedFiles, setQueuedFiles] = useState<string[]>([]);

  const totalSizeLabel = useMemo(() => {
    if (queuedFiles.length === 0) return "No files queued";
    return `${queuedFiles.length} file${queuedFiles.length === 1 ? "" : "s"} queued for advisor review`;
  }, [queuedFiles]);

  return (
    <div className="space-y-4 animate-fade-in">
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
        <p className="text-[10px] uppercase tracking-[0.16em] text-sky-300/70">Client access setup</p>
        <h1 className="mt-1 text-xl font-semibold text-white">Advisor-managed onboarding access</h1>
        <p className="mt-2 text-sm text-slate-400">
          Your advisor runs onboarding from the operations console. Use this page only for requested document uploads, invite acceptance, and minimal detail confirmation.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Link href="/dashboard" className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-semibold text-slate-200 hover:bg-white/10">Open dashboard</Link>
          <a href="mailto:support@asraawealth.com?subject=Onboarding%20support" className="rounded-lg border border-sky-400/20 bg-sky-500/10 px-3 py-2 font-semibold text-sky-100 hover:bg-sky-500/15">Request advisor support</a>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-white">Requested uploads</h2>
        <p className="mt-1 text-xs text-slate-400">Upload only files requested by your advisor. Processing and activation happen in admin operations.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {REQUESTED_UPLOADS.map((label) => (
            <div key={label} className="rounded-lg border border-white/8 bg-black/20 px-3 py-2 text-xs text-slate-300">{label}</div>
          ))}
        </div>

        <label className="mt-4 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-sky-300/30 bg-sky-500/[0.06] px-4 py-5 text-center text-sm text-sky-100">
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(event) => {
              const files = event.target.files;
              if (!files || files.length === 0) return;
              setQueuedFiles((current) => [...current, ...Array.from(files).map((file) => file.name)]);
            }}
          />
          Click to queue files for advisor review
        </label>

        <p className="mt-3 text-xs text-slate-400">{totalSizeLabel}</p>
        {queuedFiles.length > 0 ? (
          <div className="mt-2 space-y-1">
            {queuedFiles.slice(-6).map((file) => (
              <p key={file} className="text-xs text-slate-300">• {file}</p>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
