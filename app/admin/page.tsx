"use client";

import { useEffect, useState } from "react";
import { fetcher } from "@/lib/fetcher";
import type { User, AdminClient, AdminPortfolioItem } from "@/lib/api";
import Card from "@/components/ui/Card";
import Loader from "@/components/ui/Loader";
import ErrorState from "@/components/ui/ErrorState";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [portfolio, setPortfolio] = useState<AdminPortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    const { signal } = ac;

    Promise.allSettled([
      fetcher<User[]>("/users", { signal }),
      fetcher<AdminClient[]>("/clients", { signal }),
      fetcher<AdminPortfolioItem[]>("/portfolio", { signal }),
    ])
      .then(([usersRes, clientsRes, portfolioRes]) => {
        if (usersRes.status === "fulfilled") setUsers(usersRes.value);
        else console.error("Failed to load users:", usersRes.reason);
        if (clientsRes.status === "fulfilled") setClients(clientsRes.value);
        else console.error("Failed to load clients:", clientsRes.reason);
        if (portfolioRes.status === "fulfilled") setPortfolio(portfolioRes.value);
        else console.error("Failed to load portfolio:", portfolioRes.reason);

        const allFailed = [usersRes, clientsRes, portfolioRes].every(
          (r) => r.status === "rejected"
        );
        if (allFailed) setError("Unable to reach backend API");
      })
      .finally(() => setLoading(false));

    return () => ac.abort();
  }, []);

  const totalPortfolioValue = portfolio.reduce(
    (sum, p) => sum + (p.total_value ?? 0),
    0
  );

  if (loading) return <Loader />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-100">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card title="Total Users">
          <p className="text-4xl font-bold text-slate-100">{users.length}</p>
        </Card>
        <Card title="Total Clients">
          <p className="text-4xl font-bold text-slate-100">{clients.length}</p>
        </Card>
        <Card title="Total Portfolio Value">
          <p className="text-4xl font-bold text-slate-100">
            {totalPortfolioValue > 0 ? fmt(totalPortfolioValue) : "—"}
          </p>
        </Card>
      </div>
    </div>
  );
}

