"use client";

import type { DragEvent } from "react";
import { PORTFOLIO_RUNTIME_STATES } from "@/domains/onboarding";
import type { UploadQueueItem } from "@/domains/onboarding";

function fmtBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 ** 2) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 ** 2).toFixed(1)} MB`;
}

export function PortfolioImportStep({
  queue,
  processingStageIndex,
  manualEntryEnabled,
  advisorAssistScheduled,
  onBack,
  onFilesSelected,
  onDropFiles,
  onToggleManualEntry,
  onScheduleAdvisorAssist,
  onStartActivation,
}: {
  queue: UploadQueueItem[];
  processingStageIndex: number;
  manualEntryEnabled: boolean;
  advisorAssistScheduled: boolean;
  onBack: () => void;
  onFilesSelected: (files: FileList | null) => void;
  onDropFiles: (files: FileList) => void;
  onToggleManualEntry: () => void;
  onScheduleAdvisorAssist: () => void;
  onStartActivation: () => void;
}) {
  const uploadedCount = queue.filter((item) => item.status === "uploaded" || item.status === "processing" || item.status === "processed").length;
  const canActivate = uploadedCount > 0;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Assisted portfolio activation</p>
      <h2 className="mt-1 text-lg font-semibold text-white">Portfolio Import Experience</h2>
      <p className="mt-2 text-sm text-slate-400">
        Upload CAS statements, broker PDFs, screenshots, Excel sheets, and property documents for assisted ingestion.
      </p>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-3">
          <label
            className="block cursor-pointer rounded-xl border-2 border-dashed border-sky-300/35 bg-sky-500/[0.06] p-5 text-center"
            onDragOver={(event: DragEvent<HTMLLabelElement>) => event.preventDefault()}
            onDrop={(event: DragEvent<HTMLLabelElement>) => {
              event.preventDefault();
              if (event.dataTransfer.files.length > 0) onDropFiles(event.dataTransfer.files);
            }}
          >
            <p className="text-sm font-semibold text-white">Drag & drop documents here</p>
            <p className="mt-1 text-xs text-slate-400">or click to upload for assisted onboarding</p>
            <input
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.xls,.xlsx,.csv,.doc,.docx"
              className="hidden"
              onChange={(event) => onFilesSelected(event.target.files)}
            />
          </label>

          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Upload queue</p>
              <p className="text-xs text-slate-500">{queue.length} document(s)</p>
            </div>
            {queue.length === 0 ? (
              <p className="text-xs text-slate-500">No documents uploaded yet.</p>
            ) : (
              <ul className="space-y-2">
                {queue.map((item) => (
                  <li key={item.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-semibold text-white">{item.name}</p>
                      <span className="text-[10px] text-slate-400">{fmtBytes(item.size)}</span>
                    </div>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-slate-500">{item.status}</p>
                    <div className="mt-1.5 h-1.5 rounded-full bg-white/10">
                      <div className="h-1.5 rounded-full bg-sky-400 transition-all duration-300" style={{ width: `${item.progress}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Processing runtime</p>
            <div className="mt-3 space-y-2">
              {PORTFOLIO_RUNTIME_STATES.map((state, index) => {
                const active = processingStageIndex === index + 1;
                const done = processingStageIndex > index + 1;
                return (
                  <div key={state} className="flex items-center gap-2 text-xs">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        done ? "bg-emerald-400" : active ? "bg-sky-300 live-pulse" : "bg-white/20"
                      }`}
                    />
                    <span className={done || active ? "text-slate-200" : "text-slate-500"}>{state}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <button
              type="button"
              onClick={onToggleManualEntry}
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.1em] text-slate-200 hover:bg-white/[0.06]"
            >
              Manual Entry (Advanced Users)
            </button>
            {manualEntryEnabled ? (
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                Manual entry mode enabled. Advanced users can onboard holdings directly if document ingestion is not required.
              </p>
            ) : null}
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <button
              type="button"
              onClick={onScheduleAdvisorAssist}
              className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-200 hover:bg-white/[0.06]"
            >
              Schedule Advisor-Assisted Setup
            </button>
            {advisorAssistScheduled ? (
              <p className="mt-2 text-xs text-amber-200">Advisor-assisted setup requested. Our team will review your onboarding intake.</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300 hover:bg-white/[0.06]"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onStartActivation}
          disabled={!canActivate}
          className="rounded-xl bg-sky-400 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#04102a] hover:bg-sky-300 disabled:opacity-40"
        >
          Activate Wealth OS
        </button>
      </div>
    </section>
  );
}
