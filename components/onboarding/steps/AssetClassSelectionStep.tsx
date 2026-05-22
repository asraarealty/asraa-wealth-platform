"use client";

import { ASSET_CLASS_OPTIONS } from "@/domains/onboarding";

export function AssetClassSelectionStep({
  selectedAssetClasses,
  onToggleAssetClass,
  onBack,
  onContinue,
}: {
  selectedAssetClasses: string[];
  onToggleAssetClass: (id: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Institutional coverage mapping</p>
      <h2 className="mt-1 text-lg font-semibold text-white">Select Wealth Categories</h2>
      <p className="mt-2 text-sm text-slate-400">
        Choose the asset classes we should activate in your wealth operating system.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ASSET_CLASS_OPTIONS.map((assetClass) => {
          const active = selectedAssetClasses.includes(assetClass.id);
          return (
            <button
              key={assetClass.id}
              type="button"
              onClick={() => onToggleAssetClass(assetClass.id)}
              className={`rounded-xl border p-4 text-left transition ${
                active
                  ? "border-sky-300/40 bg-sky-500/10"
                  : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/[0.04]"
              }`}
            >
              <p className="text-sm font-semibold text-white">{assetClass.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-400">{assetClass.description}</p>
            </button>
          );
        })}
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
          onClick={onContinue}
          className="rounded-xl bg-sky-400 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#04102a] hover:bg-sky-300"
        >
          Continue to Import
        </button>
      </div>
    </section>
  );
}
