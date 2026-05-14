"use client";

import { useMemo, useState } from "react";
import Loader from "@/components/ui/Loader";
import { useToast } from "@/context/ToastContext";
import { useEnterpriseReports } from "@/lib/hooks/useEnterpriseReports";
import { fmtCurrency } from "@/lib/formatters";
import type { EnterpriseClientReport } from "@/lib/types/enterpriseReports";

type ReportType =
  | "consolidated-holdings"
  | "portfolio-performance"
  | "allocation-analysis"
  | "transaction-ledger"
  | "real-estate-summary"
  | "rent-roll"
  | "lease-report"
  | "maintenance-report";

type ExportFormat = "csv" | "xlsx" | "pdf";
type AssetTypeFilter = "all" | "equity" | "mf" | "real_estate" | "commodity";
type PropertyTypeFilter =
  | "all"
  | "commercial"
  | "residential"
  | "industrial"
  | "warehouse"
  | "office"
  | "retail"
  | "land"
  | "hospitality"
  | "mixed_use"
  | "other";

const REPORT_OPTIONS: Array<{ value: ReportType; label: string }> = [
  { value: "consolidated-holdings", label: "Consolidated Holdings" },
  { value: "portfolio-performance", label: "Portfolio Performance" },
  { value: "allocation-analysis", label: "Allocation Analysis" },
  { value: "transaction-ledger", label: "Transaction Ledger" },
  { value: "real-estate-summary", label: "Real-Estate Summary" },
  { value: "rent-roll", label: "Rent Roll" },
  { value: "lease-report", label: "Lease Report" },
  { value: "maintenance-report", label: "Maintenance Report" },
];

function slug(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function downloadBlob(content: BlobPart, type: string, filename: string) {
  const blob = new Blob([content], { type });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(href);
}

function toRows(clients: EnterpriseClientReport[]) {
  const header = ["Client", "Email", "Status", "Portfolio Value", "Invested", "Returns", "Risk"];
  const rows = clients.map((client) => [
    client.name,
    client.email,
    client.status,
    client.portfolioValue.toFixed(2),
    client.totalInvested.toFixed(2),
    client.gainsLosses.toFixed(2),
    client.riskLevel,
  ]);
  return { header, rows };
}

export default function ReportsPage() {
  const { showToast } = useToast();
  const { data, loading, refreshing, error, refresh } = useEnterpriseReports();
  const [reportType, setReportType] = useState<ReportType>("consolidated-holdings");
  const [assetType, setAssetType] = useState<AssetTypeFilter>("all");
  const [propertyType, setPropertyType] = useState<PropertyTypeFilter>("all");
  const [clientId, setClientId] = useState<number | "all">("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [progress, setProgress] = useState(0);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [lastFailedFormat, setLastFailedFormat] = useState<ExportFormat | null>(null);

  const clients = data?.clients ?? [];
  const generatedAtDate = data?.generatedAt ? new Date(data.generatedAt) : null;
  const generatedAtMs = generatedAtDate && !Number.isNaN(generatedAtDate.getTime()) ? generatedAtDate.getTime() : null;
  const fromDateMs = fromDate ? new Date(`${fromDate}T00:00:00.000Z`).getTime() : null;
  const toDateMs = toDate ? new Date(`${toDate}T23:59:59.999Z`).getTime() : null;

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      if (clientId !== "all" && client.clientId !== clientId) return false;
      if (assetType === "equity" && client.equityPct <= 0) return false;
      if (assetType === "mf" && client.mfPct <= 0) return false;
      if (assetType === "real_estate" && client.realEstatePct <= 0) return false;
      if (assetType === "commodity" && client.commodityPct <= 0) return false;

      if (propertyType !== "all" && reportType === "real-estate-summary") {
        const hasPropertyBucket = data?.occupancyHeatmap.some((point) => slug(point.label) === propertyType);
        if (!hasPropertyBucket) return false;
      }

      if (generatedAtMs !== null) {
        if (fromDateMs !== null && generatedAtMs < fromDateMs) return false;
        if (toDateMs !== null && generatedAtMs > toDateMs) return false;
      }

      return true;
    });
  }, [assetType, clientId, clients, data?.occupancyHeatmap, fromDateMs, generatedAtMs, propertyType, reportType, toDateMs]);

  async function performExport(format: ExportFormat) {
    if (!data) {
      setLastFailedFormat(format);
      showToast("Report data is unavailable. Retry after refresh.", "error");
      return;
    }

    setExporting(format);
    setProgress(15);
    setLastFailedFormat(null);

    try {
      const { header, rows } = toRows(filteredClients);
      const dateLabel = new Date().toISOString().slice(0, 10);
      const selectedClient = filteredClients.find((client) => client.clientId === clientId);
      const clientName = slug(selectedClient?.name ?? (clientId === "all" ? "all-clients" : "client"));
      const reportSlug = slug(reportType);
      const fileName = `${clientName}_${reportSlug}_${dateLabel}.${format}`;
      setProgress(55);

      if (format === "csv") {
        const csv = [header, ...rows].map((row) => row.join(",")).join("\n");
        downloadBlob(csv, "text/csv;charset=utf-8;", fileName);
      } else if (format === "xlsx") {
        const tsv = [header, ...rows].map((row) => row.join("\t")).join("\n");
        downloadBlob(tsv, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
      } else {
        const htmlRows = rows
          .map(
            (row) =>
              `<tr>${row
                .map((cell) => `<td style="padding:8px;border:1px solid #d1d5db;">${cell}</td>`)
                .join("")}</tr>`
          )
          .join("");
        const html = `<!doctype html><html><body><h3>${REPORT_OPTIONS.find((item) => item.value === reportType)?.label ?? "Report"}</h3><table style="border-collapse:collapse;font-family:sans-serif;"><thead><tr>${header.map((cell) => `<th style="padding:8px;border:1px solid #d1d5db;text-align:left;">${cell}</th>`).join("")}</tr></thead><tbody>${htmlRows}</tbody></table></body></html>`;
        const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1024,height=700");
        if (!printWindow) throw new Error("Pop-up blocked");
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
      }

      setProgress(100);
      showToast(`Export ready: ${fileName}`, "success");
    } catch (err) {
      setLastFailedFormat(format);
      showToast(err instanceof Error ? err.message : "Export failed", "error");
    } finally {
      window.setTimeout(() => {
        setExporting(null);
        setProgress(0);
      }, 400);
    }
  }

  if (loading && !data) return <Loader />;

  return (
    <div className="space-y-5 p-4 sm:p-6 min-h-screen">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl text-white font-semibold">Report Center</h2>
          <p className="text-sm text-white/45">Client reports, consolidated analytics, and export center</p>
        </div>
        {refreshing ? <span className="text-xs text-cyan-300">Refreshing…</span> : null}
      </div>

      {error ? (
        <div className="glass-card rounded-2xl border border-red-400/30 p-4 text-sm text-red-200 flex flex-wrap items-center gap-3 justify-between">
          <span>{error}</span>
          <button type="button" onClick={refresh} className="rounded-lg border border-red-200/40 px-3 py-1.5">
            Retry
          </button>
        </div>
      ) : null}

      <section className="glass-card rounded-2xl border border-white/10 p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          <select className="gold-input rounded-xl px-3 py-2.5 text-sm" value={clientId} onChange={(event) => setClientId(event.target.value === "all" ? "all" : Number(event.target.value))}>
            <option value="all">All clients</option>
            {clients.map((client) => (
              <option key={client.clientId} value={client.clientId}>
                {client.name}
              </option>
            ))}
          </select>

          <select className="gold-input rounded-xl px-3 py-2.5 text-sm" value={assetType} onChange={(event) => setAssetType(event.target.value as AssetTypeFilter)}>
            <option value="all">All asset types</option>
            <option value="equity">Equity</option>
            <option value="mf">Mutual fund</option>
            <option value="real_estate">Real estate</option>
            <option value="commodity">Commodity</option>
          </select>

          <select className="gold-input rounded-xl px-3 py-2.5 text-sm" value={propertyType} onChange={(event) => setPropertyType(event.target.value as PropertyTypeFilter)}>
            <option value="all">All property types</option>
            <option value="commercial">Commercial</option>
            <option value="residential">Residential</option>
            <option value="industrial">Industrial</option>
            <option value="warehouse">Warehouse</option>
            <option value="office">Office</option>
            <option value="retail">Retail</option>
            <option value="land">Land</option>
            <option value="hospitality">Hospitality</option>
            <option value="mixed_use">Mixed use</option>
            <option value="other">Other</option>
          </select>

          <input type="date" className="gold-input rounded-xl px-3 py-2.5 text-sm" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
          <input type="date" className="gold-input rounded-xl px-3 py-2.5 text-sm" value={toDate} onChange={(event) => setToDate(event.target.value)} />
        </div>
      </section>

      <section className="glass-card rounded-2xl border border-white/10 p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-white">Report generation</h3>
          <select className="gold-input rounded-xl px-3 py-2.5 text-sm min-w-52" value={reportType} onChange={(event) => setReportType(event.target.value as ReportType)}>
            {REPORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="rounded-xl border border-white/10 p-3 bg-white/[0.02]">
            <p className="text-xs text-white/50">Clients in report</p>
            <p className="text-base font-semibold text-white mt-1">{filteredClients.length}</p>
          </div>
          <div className="rounded-xl border border-white/10 p-3 bg-white/[0.02]">
            <p className="text-xs text-white/50">Combined value</p>
            <p className="text-base font-semibold text-white mt-1">{fmtCurrency(filteredClients.reduce((sum, row) => sum + row.portfolioValue, 0))}</p>
          </div>
          <div className="rounded-xl border border-white/10 p-3 bg-white/[0.02]">
            <p className="text-xs text-white/50">Combined invested</p>
            <p className="text-base font-semibold text-white mt-1">{fmtCurrency(filteredClients.reduce((sum, row) => sum + row.totalInvested, 0))}</p>
          </div>
          <div className="rounded-xl border border-white/10 p-3 bg-white/[0.02]">
            <p className="text-xs text-white/50">Generated at</p>
            <p className="text-base font-semibold text-white mt-1">{data ? new Date(data.generatedAt).toLocaleString() : "N/A"}</p>
          </div>
        </div>
      </section>

      <section className="glass-card rounded-2xl border border-white/10 p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-white">Export center</h3>
          {exporting ? <span className="text-xs text-cyan-300">Exporting {exporting.toUpperCase()}… {progress}%</span> : null}
        </div>
        {exporting ? (
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full bg-cyan-300 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={Boolean(exporting)} onClick={() => void performExport("csv")} className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/85 disabled:opacity-50">CSV</button>
          <button type="button" disabled={Boolean(exporting)} onClick={() => void performExport("xlsx")} className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/85 disabled:opacity-50">XLSX</button>
          <button type="button" disabled={Boolean(exporting)} onClick={() => void performExport("pdf")} className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/85 disabled:opacity-50">PDF</button>
          {lastFailedFormat ? (
            <button
              type="button"
              disabled={Boolean(exporting)}
              onClick={() => void performExport(lastFailedFormat)}
              className="rounded-lg border border-amber-300/40 px-3 py-2 text-sm text-amber-200 disabled:opacity-50"
            >
              Retry {lastFailedFormat.toUpperCase()}
            </button>
          ) : null}
        </div>
      </section>

      <section className="glass-card rounded-2xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                {["Client", "Status", "Value", "Invested", "Returns", "Risk", "Allocation"].map((label) => (
                  <th key={label} className="text-left px-4 py-3 text-[11px] uppercase tracking-widest text-white/55">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => (
                <tr key={client.clientId} className="border-b border-white/5 last:border-b-0">
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{client.name}</p>
                    <p className="text-xs text-white/50">{client.email}</p>
                  </td>
                  <td className="px-4 py-3 text-white/75">{client.status}</td>
                  <td className="px-4 py-3 text-white">{fmtCurrency(client.portfolioValue)}</td>
                  <td className="px-4 py-3 text-white/80">{fmtCurrency(client.totalInvested)}</td>
                  <td className={`px-4 py-3 ${client.gainsLosses >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {fmtCurrency(client.gainsLosses)}
                  </td>
                  <td className="px-4 py-3 text-white/80">{client.riskLevel}</td>
                  <td className="px-4 py-3 text-white/65 text-xs whitespace-nowrap">
                    Eq {client.equityPct.toFixed(1)} / MF {client.mfPct.toFixed(1)} / RE {client.realEstatePct.toFixed(1)} / Co {client.commodityPct.toFixed(1)}
                  </td>
                </tr>
              ))}
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-white/55">
                    No rows match current filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
