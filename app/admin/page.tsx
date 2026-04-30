"use client";

import { useEffect, useMemo, useState } from "react";
import { getAdminPortfolio } from "@/lib/services/portfolioService";
import { getPortfolioIntelligence } from "@/lib/services/portfolioService";
import { getAdminClients } from "@/lib/services/clientService";
import { toErrorMessage } from "@/lib/fetcher";
import type { AdminPortfolioItem, AdminClient, Portfolio } from "@/lib/api";
import type { ClientIntelligence } from "@/components/admin/dashboard/intelligenceHelpers";
import StatBox from "@/components/ui/StatBox";
import Loader from "@/components/ui/Loader";
import ErrorState from "@/components/ui/ErrorState";
import PortfolioGrowthChart from "@/components/dashboard/PortfolioGrowthChart";
import AllocationChart from "@/components/dashboard/AllocationChart";
import AlertsPanel from "@/components/admin/dashboard/AlertsPanel";
import ClientIntelligenceTable from "@/components/admin/dashboard/ClientIntelligenceTable";
import RecommendationCard from "@/components/admin/dashboard/RecommendationCard";
import {
  deriveAlerts,
  calcAverageReturn,
} from "@/components/admin/dashboard/intelligenceHelpers";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export default function AdminPage() {
  const [portfolio, setPortfolio] = useState<AdminPortfolioItem[]>([]);
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [intelligenceRows, setIntelligenceRows] = useState<ClientIntelligence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    const { signal } = ac;

    Promise.allSettled([
      getAdminPortfolio(signal),
      getAdminClients(signal),
      getPortfolioIntelligence(signal),
    ])
      .then(([portfolioRes, clientsRes, intelligenceRes]) => {
        if (portfolioRes.status === "fulfilled") setPortfolio(portfolioRes.value);
        if (clientsRes.status === "fulfilled") setClients(clientsRes.value);
        if (intelligenceRes.status === "fulfilled") setIntelligenceRows(intelligenceRes.value);

        const allFailed = [portfolioRes, clientsRes, intelligenceRes].every(
          (r) => r.status === "rejected"
        );
        if (allFailed) {
          const reason =
            portfolioRes.status === "rejected" ? portfolioRes.reason : null;
          setError(toErrorMessage(reason));
        }
      })
      .finally(() => setLoading(false));

    return () => ac.abort();
  }, []);

  // Aggregate stats derived from real intelligence rows
  const totalAUM = useMemo(
    () => intelligenceRows.reduce((sum, r) => sum + r.portfolioValue, 0),
    [intelligenceRows]
  );
  const activeClients = clients.filter((c) => c.is_active).length;

  // Chart data — uses the global portfolio fetch (for layout continuity)
  const portfolioForChart: Portfolio[] = portfolio.map((p) => ({
    id: p.id,
    symbol: p.symbol,
    name: p.name,
    quantity: p.quantity,
    avg_price: p.avg_price,
    current_price: p.current_price,
    value: p.value,
  }));

  // Derived from real per-client intelligence
  const alerts = useMemo(() => deriveAlerts(intelligenceRows), [intelligenceRows]);
  const avgReturn = useMemo(() => calcAverageReturn(intelligenceRows), [intelligenceRows]);

  if (loading) return <Loader />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-8 text-white">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-[#c9a227]">Financial Intelligence</h1>
        <p className="text-sm text-gray-400 mt-1">
          Actionable insights across all client portfolios.
        </p>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatBox
          label="Total AUM"
          value={fmt(totalAUM)}
          subValue="Assets Under Management"
          trend="up"
          trendLabel="+12.4%"
        />
        <StatBox
          label="Avg Return"
          value={`${avgReturn}%`}
          subValue="Across all clients"
          trend={avgReturn >= 8 ? "up" : avgReturn >= 5 ? "neutral" : "down"}
          trendLabel={avgReturn >= 8 ? "Above target" : avgReturn >= 5 ? "On track" : "Below target"}
        />
        <StatBox
          label="Total Clients"
          value={clients.length}
          subValue={`${activeClients} active`}
        />
        <StatBox
          label="Active Alerts"
          value={alerts.length}
          subValue={alerts.length === 0 ? "All portfolios healthy" : "Requires attention"}
          trend={alerts.length === 0 ? "up" : alerts.length <= 2 ? "neutral" : "down"}
        />
      </div>

      {/* PORTFOLIO OVERVIEW */}
      <section>
        <SectionHeading title="Portfolio Overview" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PortfolioGrowthChart totalValue={totalAUM} gainPercent={avgReturn} />
          </div>
          <div>
            <AllocationChart positions={portfolioForChart} />
          </div>
        </div>
      </section>

      {/* CLIENT INTELLIGENCE TABLE */}
      <section>
        <SectionHeading title="Client Intelligence" link="/admin/clients" linkLabel="View all clients →" />
        <ClientIntelligenceTable rows={intelligenceRows} />
      </section>

      {/* ALERTS + RECOMMENDATIONS */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section>
          <SectionHeading title="Alerts" />
          <AlertsPanel alerts={alerts} />
        </section>
        <section>
          <SectionHeading title="Recommendations" />
          <RecommendationCard rows={intelligenceRows.slice(0, 5)} />
        </section>
      </div>

    </div>
  );
}

function SectionHeading({
  title,
  link,
  linkLabel,
}: {
  title: string;
  link?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-[#c9a227]">
        {title}
      </h2>
      {link && (
        <a href={link} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
          {linkLabel ?? "View all →"}
        </a>
      )}
    </div>
  );
}
