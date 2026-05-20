"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AssetCard } from "@/components/admin/platform/AssetCard";
import { OperationalEmptyState } from "@/components/admin/platform/EmptyState";
import { PlatformConfirmModal } from "@/components/admin/platform/PlatformModal";
import { LoadingBlock, SectionHeader, SurfaceCard } from "@/components/v2/ui";
import { useAssets, useDeleteAsset } from "@/lib/hooks/useAssets";
import { fmtCurrency, fmtPercent } from "@/lib/formatters";
import type { Asset, AssetType } from "@/lib/types/assets";
import { toPortfolioHolding } from "@/domains/portfolio";

const TABS: { key: AssetType | "all"; label: string; emptyTitle: string; emptyHint: string }[] = [
  { key: "all", label: "All assets", emptyTitle: "Portfolio not onboarded", emptyHint: "Holdings sync" },
  { key: "stock", label: "Stocks", emptyTitle: "No equity book yet", emptyHint: "Equity onboarding" },
  { key: "mf", label: "Mutual funds", emptyTitle: "No fund mandates yet", emptyHint: "Fund onboarding" },
  { key: "commodity", label: "Commodities", emptyTitle: "No commodity hedges yet", emptyHint: "Hedge onboarding" },
  { key: "property", label: "Property", emptyTitle: "Property pipeline pending", emptyHint: "Real estate onboarding" },
];

export default function AssetsPage() {
  const [activeTab, setActiveTab] = useState<AssetType | "all">("all");
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const { data, isLoading } = useAssets();
  const deleteAssetMutation = useDeleteAsset();

  const assets = data?.assets ?? [];
  const summary = data?.summary;
  const filtered = useMemo(
    () => (activeTab === "all" ? assets : assets.filter((asset: Asset) => asset.type === activeTab)),
    [activeTab, assets]
  );
  const activeTabMeta = TABS.find((tab) => tab.key === activeTab) ?? TABS[0];

  return (
    <div className="space-y-5">
      <SurfaceCard className="p-4 sm:p-5">
        <SectionHeader
          eyebrow="Portfolio operating system"
          title="Asset intelligence workspace"
          subtitle="Unified valuation, risk, income, and operating controls across every asset class"
          action={<Link href="/assets/new" className="rounded-xl bg-sky-400 px-4 py-2 text-sm font-semibold text-[#04102a] transition hover:bg-sky-300">Add Asset</Link>}
        />
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric label="Live value" value={fmtCurrency(summary?.total_value ?? 0)} />
          <Metric label="Invested capital" value={fmtCurrency(summary?.total_invested ?? 0)} />
          <Metric label="Unrealized PnL" value={fmtCurrency(summary?.total_return ?? 0)} accent={(summary?.total_return ?? 0) >= 0 ? "text-emerald-200" : "text-rose-200"} />
          <Metric label="Return %" value={fmtPercent(summary?.return_percentage ?? 0, true)} accent={(summary?.return_percentage ?? 0) >= 0 ? "text-emerald-200" : "text-rose-200"} />
        </div>
      </SurfaceCard>

      <SurfaceCard className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition ${activeTab === tab.key ? "border-sky-300/30 bg-sky-500/10 text-sky-100" : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </SurfaceCard>

      {isLoading ? (
        <LoadingBlock label="Loading asset intelligence…" />
      ) : filtered.length === 0 ? (
        <OperationalEmptyState
          title={activeTabMeta.emptyTitle}
          description={activeTab === "all" ? "Connect the first holding to activate live valuation, allocation intelligence, and operating controls." : `Start the ${activeTabMeta.label.toLowerCase()} workflow to populate this operating book.`}
          hint={activeTabMeta.emptyHint}
          action={<Link href="/assets/new" className="rounded-xl bg-sky-400 px-4 py-2 text-sm font-semibold text-[#04102a]">Add asset</Link>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {filtered.map((asset: Asset) => {
            const holding = toPortfolioHolding(asset);
            return (
              <AssetCard
                key={asset.id}
                asset={asset}
                holding={holding}
                onDelete={() => setAssetToDelete(asset)}
                deleteLabel="Delete"
              />
            );
          })}
        </div>
      )}

      {assetToDelete ? (
        <PlatformConfirmModal
          title="Delete Asset"
          description="This asset will be removed from active operations and the portfolio valuation engine."
          confirmLabel="Delete asset"
          onClose={() => setAssetToDelete(null)}
          onConfirm={() => deleteAssetMutation.mutate(assetToDelete.id, { onSuccess: () => setAssetToDelete(null) })}
          pending={deleteAssetMutation.isPending}
        />
      ) : null}
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
      <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className={`mt-2 text-lg font-semibold text-white ${accent ?? ""}`}>{value}</p>
    </div>
  );
}
