"use client";

import { useEffect, useState } from "react";
import { getUsers } from "@/lib/services/userService";
import { getAdminPortfolio } from "@/lib/services/portfolioService";
import { getAdminClients } from "@/lib/services/clientService";
import { toErrorMessage } from "@/lib/fetcher";
import type { User, AdminPortfolioItem, AdminClient } from "@/lib/api";
import StatBox from "@/components/ui/StatBox";
import EmptyState from "@/components/ui/EmptyState";
import Loader from "@/components/ui/Loader";
import ErrorState from "@/components/ui/ErrorState";
import PortfolioGrowthChart from "@/components/dashboard/PortfolioGrowthChart";
import AllocationChart from "@/components/dashboard/AllocationChart";
import type { Portfolio } from "@/lib/api";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

function fmtFull(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [portfolio, setPortfolio] = useState<AdminPortfolioItem[]>([]);
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    const { signal } = ac;

    Promise.allSettled([
      getUsers(signal),
      getAdminPortfolio(signal),
      getAdminClients(signal),
    ])
      .then(([usersRes, portfolioRes, clientsRes]) => {
        if (usersRes.status === "fulfilled") setUsers(usersRes.value);
        if (portfolioRes.status === "fulfilled") setPortfolio(portfolioRes.value);
        if (clientsRes.status === "fulfilled") setClients(clientsRes.value);

        const allFailed = [usersRes, portfolioRes, clientsRes].every(
          (r) => r.status === "rejected"
        );
        if (allFailed) {
          const reason = usersRes.status === "rejected" ? usersRes.reason : null;
          setError(toErrorMessage(reason));
        }
      })
      .finally(() => setLoading(false));

    return () => ac.abort();
  }, []);

  // 🔥 METRICS
  const totalAUM = portfolio.reduce((sum, p) => sum + (p.value ?? 0), 0);
  const activeInvestments = portfolio.filter((p) => (p.value ?? 0) > 0).length;
  const activeClients = clients.filter((c) => c.is_active).length;

  // 🔥 SPLIT ASSETS (FIXED)
  const stockItems = portfolio
    .filter((p) => p.symbol && !p.symbol.startsWith("PROP-") && !/^\d+$/.test(p.symbol))
    .slice(0, 5);

  const mutualFundItems = portfolio
    .filter((p) => /^\d+$/.test(p.symbol)) // numeric-only = MF code
    .slice(0, 5);

  const realEstateItems = portfolio
    .filter((p) => p.symbol && p.symbol.startsWith("PROP-"))
    .slice(0, 5);

  // 🔥 CHART DATA
  const portfolioForChart: Portfolio[] = portfolio.map((p) => ({
    id: p.id,
    symbol: p.symbol,
    name: p.name,
    quantity: p.quantity,
    avg_price: p.avg_price,
    current_price: p.current_price,
    value: p.value,
  }));

  if (loading) return <Loader />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-8 text-white">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold text-[#c9a227]">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-1">
          Welcome back — here&apos;s your wealth overview.
        </p>
      </div>

      {/* METRICS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatBox label="Total AUM" value={fmt(totalAUM)} subValue="Assets Under Management" />
        <StatBox label="Clients" value={clients.length} subValue={`${activeClients} active`} />
        <StatBox label="Investments" value={activeInvestments} subValue={`${portfolio.length} total`} />
        <StatBox label="Growth" value="8.3%" subValue="Monthly" />
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PortfolioGrowthChart totalValue={totalAUM} gainPercent={12.4} />
        </div>
        <div>
          <AllocationChart positions={portfolioForChart} />
        </div>
      </div>

      {/* STOCKS */}
      <Section title="Stocks" link="/admin/stocks">
        {stockItems.length === 0 ? (
          <EmptyState title="No stocks" description="Add stocks" />
        ) : (
          <Table items={stockItems} />
        )}
      </Section>

      {/* MUTUAL FUNDS */}
      <Section title="Mutual Funds" link="/admin/mutual-funds">
        {mutualFundItems.length === 0 ? (
          <EmptyState title="No funds" description="Add mutual funds" />
        ) : (
          <Table items={mutualFundItems} />
        )}
      </Section>

      {/* REAL ESTATE */}
      <Section title="Real Estate" link="/admin/real-estate">
        {realEstateItems.length === 0 ? (
          <EmptyState title="No properties" description="Add properties" />
        ) : (
          <Table items={realEstateItems} />
        )}
      </Section>
    </div>
  );
}

/* 🔥 REUSABLE COMPONENTS */

function Section({ title, link, children }: any) {
  return (
    <section>
      <div className="flex justify-between mb-3">
        <h2 className="text-sm uppercase text-[#c9a227]">{title}</h2>
        <a href={link} className="text-xs text-gray-500">View all →</a>
      </div>
      {children}
    </section>
  );
}

function Table({ items }: any) {
  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <tbody>
          {items.map((i: any) => (
            <tr key={i.id} className="border-b border-gray-800">
              <td className="px-4 py-3 text-white">{i.name || i.symbol}</td>
              <td className="px-4 py-3 text-[#c9a227]">{i.value ? `$${i.value}` : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
