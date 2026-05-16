"use client";

import { useEffect, useRef } from "react";
import type { EnrichedClient } from "@/lib/hooks/useAdminClients";
import { useClientDetail } from "@/lib/hooks/useClientDetail";
import { fmtCurrency, fmtPercent } from "@/lib/formatters";
import { StatusPill } from "@/components/v2/ui";

function fmtDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function AllocationBar({
  mix,
}: {
  mix: { stock: number; mf: number; property: number; commodity: number };
}) {
  const total = mix.stock + mix.mf + mix.property + mix.commodity;
  if (total === 0) return <span className="text-slate-500 text-xs">Awaiting live holdings sync</span>;
  return (
    <div className="flex rounded-full overflow-hidden h-2 w-full">
      {mix.stock > 0 && (
        <div
          style={{ width: `${mix.stock}%`, background: "#38bdf8" }}
          title={`Equity ${mix.stock.toFixed(1)}%`}
        />
      )}
      {mix.mf > 0 && (
        <div
          style={{ width: `${mix.mf}%`, background: "#818cf8" }}
          title={`Funds ${mix.mf.toFixed(1)}%`}
        />
      )}
      {mix.property > 0 && (
        <div
          style={{ width: `${mix.property}%`, background: "#34d399" }}
          title={`Real Estate ${mix.property.toFixed(1)}%`}
        />
      )}
      {mix.commodity > 0 && (
        <div
          style={{ width: `${mix.commodity}%`, background: "#f59e0b" }}
          title={`Commodity ${mix.commodity.toFixed(1)}%`}
        />
      )}
    </div>
  );
}

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-sky-300/70 mb-0.5">
        {sub ?? "Portfolio Intelligence"}
      </p>
      <h3 className="text-sm font-bold text-white">{title}</h3>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-white/8 my-4" />;
}

interface Props {
  client: EnrichedClient | null;
  onClose: () => void;
}

export function ClientDetailPanel({ client, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { transactions, insights, loading: detailLoading } = useClientDetail(
    client ? client.id : null
  );

  // Close on Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Trap focus within panel
  useEffect(() => {
    if (client) panelRef.current?.focus();
  }, [client]);

  if (!client) return null;

  const propertyAssets = client.assets.filter((a) => a.type === "property");
  const stockAssets = client.assets.filter((a) => a.type === "stock");
  const mfAssets = client.assets.filter((a) => a.type === "mf");
  const commodityAssets = client.assets.filter((a) => a.type === "commodity");

  const alertItems = insights?.alerts ?? [];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Client detail: ${client.name}`}
        className="fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto outline-none"
        style={{
          background:
            "linear-gradient(160deg, rgba(10,22,51,0.98) 0%, rgba(4,9,21,0.99) 100%)",
          borderLeft: "1px solid rgba(56,189,248,0.2)",
          boxShadow: "-10px 0 40px rgba(0,4,20,0.7)",
        }}
      >
        {/* Panel header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-5 py-4"
          style={{
            background: "rgba(4,9,21,0.95)",
            borderBottom: "1px solid rgba(56,189,248,0.15)",
          }}
        >
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-sky-300/60">
              Client Intelligence
            </p>
            <h2 className="text-base font-bold text-white mt-0.5">
              {client.name}
            </h2>
            <p className="text-xs text-slate-400">{client.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusPill
              label={client.isActive ? "Active" : "Inactive"}
              tone={client.isActive ? "success" : "danger"}
            />
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close panel"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Panel body */}
        <div className="px-5 py-5 space-y-1">
          {/* 1. Portfolio Intelligence */}
          <SectionTitle
            title="Portfolio Intelligence"
            sub="Section 1"
          />
          <div className="grid grid-cols-2 gap-2 mb-3">
            {[
              {
                label: "Total Value",
                value:
                  client.totalNetWorth > 0
                    ? fmtCurrency(client.totalNetWorth)
                    : "—",
              },
              {
                label: "Equity Exposure",
                value:
                  client.totalNetWorth > 0
                    ? fmtPercent(client.equityExposurePct)
                    : "—",
              },
              {
                label: "Properties",
                value: String(client.propertiesCount),
              },
              {
                label: "Monthly Rent",
                value:
                  client.monthlyRentIncome > 0
                    ? fmtCurrency(client.monthlyRentIncome)
                    : "—",
              },
              {
                label: "Commodity Exposure",
                value:
                  client.totalNetWorth > 0
                    ? fmtPercent(client.commodityExposurePct)
                    : "—",
              },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="v2-tile rounded-xl"
              >
                <p className="text-[10px] uppercase tracking-widest text-slate-500">
                  {label}
                </p>
                <p className="text-sm font-bold text-white mt-1">{value}</p>
              </div>
            ))}
          </div>

          <div className="v2-tile rounded-xl mb-1">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">
              Allocation Mix
            </p>
            <AllocationBar mix={client.allocationMix} />
            <div className="flex gap-3 mt-2 text-[10px] text-slate-400">
              <span>
                <span
                  className="inline-block w-2 h-2 rounded-full mr-1"
                  style={{ background: "#38bdf8" }}
                />
                Equity {client.allocationMix.stock.toFixed(1)}%
              </span>
              <span>
                <span
                  className="inline-block w-2 h-2 rounded-full mr-1"
                  style={{ background: "#818cf8" }}
                />
                Funds {client.allocationMix.mf.toFixed(1)}%
              </span>
              <span>
                <span
                  className="inline-block w-2 h-2 rounded-full mr-1"
                  style={{ background: "#34d399" }}
                />
                Real Estate {client.allocationMix.property.toFixed(1)}%
              </span>
              <span>
                <span
                  className="inline-block w-2 h-2 rounded-full mr-1"
                  style={{ background: "#f59e0b" }}
                />
                Commodity {client.allocationMix.commodity.toFixed(1)}%
              </span>
            </div>
          </div>

          <Divider />

          {/* 2. Real Estate Operations */}
          <SectionTitle title="Real Estate Operations" sub="Section 2" />
          {propertyAssets.length === 0 ? (
            <p className="text-xs text-slate-500 mb-3">No property assets.</p>
          ) : (
            <div className="space-y-2 mb-3">
              {propertyAssets.map((p) => (
                <div key={p.id} className="v2-tile rounded-xl">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">
                        {p.name}
                      </p>
                      {p.location && (
                        <p className="text-[10px] text-slate-500 truncate">
                          {p.location}
                        </p>
                      )}
                    </div>
                    <p className="text-xs font-bold text-sky-300 shrink-0">
                      {fmtCurrency(p.currentValue || p.value || 0)}
                    </p>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-400">
                    {p.tenantName && (
                      <span>Tenant: {p.tenantName}</span>
                    )}
                    {p.rentAmount ? (
                      <span>
                        Rent:{" "}
                        {fmtCurrency(p.rentAmount)}/mo
                      </span>
                    ) : null}
                    {p.rentDueDate && (
                      <span>
                        Due: {fmtDate(p.rentDueDate)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <Divider />

          {/* 3. Stocks, Mutual Funds & Commodities */}
          <SectionTitle title="Stocks, Mutual Funds & Commodities" sub="Section 3" />
          {stockAssets.length === 0 && mfAssets.length === 0 && commodityAssets.length === 0 ? (
            <p className="text-xs text-slate-500 mb-3">
              No liquid-market holdings.
            </p>
          ) : (
            <div className="space-y-2 mb-3">
              {[...stockAssets, ...mfAssets, ...commodityAssets]
                .sort((a, b) => (b.value || 0) - (a.value || 0))
                .slice(0, 8)
                .map((asset) => (
                  <div
                    key={asset.id}
                    className="v2-tile rounded-xl flex items-center justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded font-bold"
                          style={{
                            background:
                              asset.type === "stock"
                                ? "rgba(56,189,248,0.15)"
                                : asset.type === "mf"
                                ? "rgba(129,140,248,0.15)"
                                : "rgba(245,158,11,0.15)",
                            color:
                              asset.type === "stock"
                                ? "#38bdf8"
                                : asset.type === "mf"
                                ? "#818cf8"
                                : "#f59e0b",
                          }}
                        >
                          {asset.type === "stock" ? "EQ" : asset.type === "mf" ? "MF" : "CMD"}
                        </span>
                        <p className="text-xs font-semibold text-white truncate">
                          {asset.symbol || asset.name}
                        </p>
                      </div>
                      {asset.quantity != null && asset.quantity > 0 && (
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Qty {asset.quantity} ×{" "}
                          {fmtCurrency(asset.currentPrice || asset.avgPrice || 0)}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-white">
                        {fmtCurrency(asset.value || 0)}
                      </p>
                      {asset.returnPercent != null && (
                        <p
                          className={`text-[10px] font-semibold ${
                            asset.returnPercent >= 0
                              ? "text-emerald-400"
                              : "text-rose-400"
                          }`}
                        >
                          {fmtPercent(asset.returnPercent, true)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}

          <Divider />

          {/* 4. Transactions */}
          <SectionTitle title="Recent Transactions" sub="Section 4" />
          {detailLoading ? (
            <p className="text-xs text-slate-500 mb-3">Loading…</p>
          ) : transactions.length === 0 ? (
            <p className="text-xs text-slate-500 mb-3">No recent transactions.</p>
          ) : (
            <div className="space-y-2 mb-3">
              {transactions.slice(0, 6).map((txn) => (
                <div
                  key={txn.id}
                  className="v2-tile rounded-xl flex items-center justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded font-bold"
                        style={{
                          background:
                            txn.type === "buy"
                              ? "rgba(52,211,153,0.15)"
                              : "rgba(239,68,68,0.15)",
                          color:
                            txn.type === "buy" ? "#34d399" : "#f87171",
                        }}
                      >
                        {txn.type.toUpperCase()}
                      </span>
                      <p className="text-xs font-semibold text-white truncate">
                        {txn.symbol}
                      </p>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {fmtDate(txn.date)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-white">
                      {fmtCurrency(txn.total || 0)}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {txn.quantity} units
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Divider />

          {/* 5. AI / Risk Intelligence */}
          <SectionTitle title="AI & Risk Intelligence" sub="Section 5" />
          {detailLoading ? (
            <p className="text-xs text-slate-500 mb-3">Loading…</p>
          ) : !insights ? (
            <p className="text-xs text-slate-500 mb-3">
              No risk data available.
            </p>
          ) : (
            <div className="space-y-2 mb-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="v2-tile rounded-xl">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500">
                    Equity %
                  </p>
                  <p className="text-sm font-bold text-sky-300 mt-1">
                    {fmtPercent(insights.equityPercentage)}
                  </p>
                </div>
                <div className="v2-tile rounded-xl">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500">
                    Property %
                  </p>
                  <p className="text-sm font-bold text-emerald-300 mt-1">
                    {fmtPercent(insights.propertyPercentage)}
                  </p>
                </div>
              </div>
              {alertItems.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">
                    AI Alerts
                  </p>
                  <div className="space-y-1.5">
                    {alertItems.slice(0, 5).map((alert, i) => {
                      const text =
                        typeof alert === "string" ? alert : alert.title;
                      const severity =
                        typeof alert === "object" ? alert.severity : undefined;
                      return (
                        <div
                          key={i}
                          className="v2-tile rounded-xl flex items-start gap-2"
                          style={{
                            borderColor:
                              severity === "high"
                                ? "rgba(239,68,68,0.3)"
                                : severity === "medium"
                                ? "rgba(251,191,36,0.3)"
                                : "rgba(255,255,255,0.08)",
                          }}
                        >
                          <span
                            className="mt-0.5 w-1.5 h-1.5 rounded-full shrink-0"
                            style={{
                              background:
                                severity === "high"
                                  ? "#f87171"
                                  : severity === "medium"
                                  ? "#fbbf24"
                                  : "#94a3b8",
                            }}
                          />
                          <p className="text-xs text-slate-300 leading-relaxed">
                            {text}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <Divider />

          {/* 6. Activity Timeline */}
          <SectionTitle title="Activity Timeline" sub="Section 6" />
          <div className="space-y-2 pb-6">
            {client.assets.length === 0 && transactions.length === 0 ? (
              <p className="text-xs text-slate-500">No activity recorded.</p>
            ) : (
              [
                ...client.assets.map((a) => ({
                  date: a.createdAt || a.created_at || "",
                  label: `Asset added: ${a.name}`,
                  type: "asset" as const,
                })),
                ...transactions.map((t) => ({
                  date: t.date,
                  label: `${t.type.toUpperCase()} ${t.symbol} — ${fmtCurrency(t.total || 0)}`,
                  type: "txn" as const,
                })),
              ]
                .filter((e) => e.date)
                .sort(
                  (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime()
                )
                .slice(0, 10)
                .map((event, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className="w-2 h-2 rounded-full mt-1 shrink-0"
                        style={{
                          background:
                            event.type === "asset" ? "#38bdf8" : "#818cf8",
                        }}
                      />
                      {i < 9 && (
                        <div className="w-px flex-1 bg-white/10 mt-1 min-h-[16px]" />
                      )}
                    </div>
                    <div className="pb-2">
                      <p className="text-xs text-slate-300">{event.label}</p>
                      <p className="text-[10px] text-slate-600 mt-0.5">
                        {fmtDate(event.date)}
                      </p>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
