"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type UploadStatus = "requested" | "queued" | "uploaded";

const REQUESTED_DOCUMENTS = [
  { id: "cas", name: "CAS statements", status: "requested" as UploadStatus },
  { id: "broker", name: "Broker PDFs", status: "requested" as UploadStatus },
  { id: "property", name: "Property documents", status: "requested" as UploadStatus },
  { id: "bank", name: "Bank confirmation", status: "requested" as UploadStatus },
];

export default function OnboardingAccessPage() {
  const [queue, setQueue] = useState<Array<{ name: string; status: UploadStatus }>>([]);

  const queuedCount = queue.filter((item) => item.status === "queued").length;
  const uploadedCount = queue.filter((item) => item.status === "uploaded").length;
  const ingestionPct = queue.length === 0 ? 0 : Math.min(100, Math.round((uploadedCount / queue.length) * 100));

  const rows = useMemo(() => {
    return REQUESTED_DOCUMENTS.map((doc) => {
      const match = queue.find((item) => item.name.toLowerCase().includes(doc.name.toLowerCase().split(" ")[0]));
      return {
        ...doc,
        status: match?.status ?? doc.status,
      };
    });
  }, [queue]);

  return (
    <div className="space-y-4 animate-fade-in">
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
        <p className="text-[10px] uppercase tracking-[0.16em] text-sky-300/70">Client onboarding access</p>
        <h1 className="mt-1 text-xl font-semibold text-white">Advisor-managed onboarding workspace</h1>
        <p className="mt-2 text-sm text-slate-400">
          Your advisor manages onboarding operations internally. Use this workspace for requested document uploads and advisor-directed updates only.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Link href="/dashboard" className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-semibold text-slate-200 hover:bg-white/10">Open wealth dashboard</Link>
          <a href="mailto:support@asraawealth.com?subject=Onboarding%20support" className="rounded-lg border border-sky-400/20 bg-sky-500/10 px-3 py-2 font-semibold text-sky-100 hover:bg-sky-500/15">Request advisor support</a>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-white">Requested documents</h2>
          <span className="rounded-md border border-sky-300/25 bg-sky-500/10 px-2 py-1 text-[11px] text-sky-100">
            Upload queue: {queuedCount} pending
          </span>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="text-slate-400">
              <tr>
                <th className="px-2 py-2">Document</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Advisor comments</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-white/8">
                  <td className="px-2 py-2 text-slate-200">{row.name}</td>
                  <td className="px-2 py-2"><StatusChip status={row.status} /></td>
                  <td className="px-2 py-2 text-slate-400">Submit latest signed copy for verification.</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <label className="mt-4 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-sky-300/30 bg-sky-500/[0.06] px-4 py-5 text-center text-sm text-sky-100">
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(event) => {
              const files = event.target.files;
              if (!files || files.length === 0) return;
              setQueue((current) => [
                ...current,
                ...Array.from(files).map((file) => ({ name: file.name, status: "queued" as UploadStatus })),
              ]);
            }}
          />
          Click to queue files for advisor ingestion
        </label>

        {queue.length > 0 ? (
          <div className="mt-3 space-y-1">
            {queue.slice(-6).map((file) => (
              <p key={`${file.name}-${file.status}`} className="text-xs text-slate-300">• {file.name} <span className="text-slate-500">({file.status})</span></p>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-xs text-slate-400">No files queued.</p>
        )}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-white">Ingestion progress</h2>
        <p className="mt-1 text-xs text-slate-400">
          Portfolio activation starts after advisor verification and ingestion completion.
        </p>
        <div className="mt-3 h-2 rounded-full bg-white/10">
          <div className="h-2 rounded-full bg-gradient-to-r from-sky-400 to-blue-500" style={{ width: `${ingestionPct}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-300">
          <span className="rounded-md border border-white/10 px-2 py-1">Queued: {queuedCount}</span>
          <span className="rounded-md border border-white/10 px-2 py-1">Uploaded: {uploadedCount}</span>
          <span className="rounded-md border border-white/10 px-2 py-1">Progress: {ingestionPct}%</span>
        </div>
      </section>
    </div>
  );
}

function StatusChip({ status }: { status: UploadStatus }) {
  const tone = status === "uploaded"
    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
    : status === "queued"
      ? "border-amber-400/30 bg-amber-500/10 text-amber-200"
      : "border-white/20 bg-white/5 text-slate-300";
  return <span className={`rounded-full border px-2 py-0.5 text-[11px] ${tone}`}>{status}</span>;
}

