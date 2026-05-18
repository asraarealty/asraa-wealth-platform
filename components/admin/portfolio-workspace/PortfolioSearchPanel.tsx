"use client";

import type { PortfolioWorkspaceFilters } from "./types";

interface PortfolioSearchPanelProps {
  value: PortfolioWorkspaceFilters;
  onChange: (next: PortfolioWorkspaceFilters) => void;
}

export function PortfolioSearchPanel({ value, onChange }: PortfolioSearchPanelProps) {
  return (
    <div className="grid grid-cols-1 gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 md:grid-cols-4">
      <input
        value={value.query}
        onChange={(event) => onChange({ ...value, query: event.target.value })}
        placeholder="Search portfolios, holdings, symbols"
        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-300/40"
      />
      <select
        value={value.searchBy}
        onChange={(event) => onChange({ ...value, searchBy: event.target.value as PortfolioWorkspaceFilters["searchBy"] })}
        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
      >
        <option value="all">All fields</option>
        <option value="client">Client</option>
        <option value="asset">Asset name</option>
        <option value="stock-symbol">Stock symbol</option>
        <option value="mutual-fund">Mutual fund</option>
        <option value="commodity">Commodity</option>
      </select>
      <select
        value={value.assetClass}
        onChange={(event) => onChange({ ...value, assetClass: event.target.value as PortfolioWorkspaceFilters["assetClass"] })}
        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
      >
        <option value="all">All asset classes</option>
        <option value="stock">Stocks & ETFs</option>
        <option value="mf">Mutual funds</option>
        <option value="commodity">Commodities</option>
        <option value="property">Property</option>
      </select>
      <select
        value={value.lifecycle}
        onChange={(event) => onChange({ ...value, lifecycle: event.target.value as PortfolioWorkspaceFilters["lifecycle"] })}
        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
      >
        <option value="all">All lifecycle states</option>
        <option value="lead">Lead</option>
        <option value="onboarding">Onboarding</option>
        <option value="pending_kyc">Pending KYC</option>
        <option value="approved">Approved</option>
        <option value="active">Active</option>
        <option value="suspended">Suspended</option>
        <option value="archived">Archived</option>
      </select>
    </div>
  );
}
