"use client";

import { useEffect, useState } from "react";
import { fetcher } from "@/lib/fetcher";
import type { Deal } from "@/lib/api";
import Table from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import Loader from "@/components/ui/Loader";
import ErrorState from "@/components/ui/ErrorState";

function dealBadgeVariant(
  status: string
): "green" | "yellow" | "red" | "gray" {
  const s = status?.toLowerCase();
  if (s === "won") return "green";
  if (s === "pending" || s === "open") return "yellow";
  if (s === "lost") return "red";
  return "gray";
}

function fmtValue(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    fetcher<Deal[]>("/deals", { signal: ac.signal })
      .then(setDeals)
      .catch((err) => {
        if (err.name === "AbortError") return;
        setError(
          err.message?.includes("Unable to reach")
            ? "Unable to reach backend API"
            : "Something went wrong"
        );
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  if (loading) return <Loader />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-100">Deals</h1>
      <Table<Record<string, unknown>>
        keyField="id"
        rows={deals as unknown as Record<string, unknown>[]}
        columns={[
          { key: "id", header: "Deal ID" },
          { key: "client_id", header: "Client ID" },
          {
            key: "value",
            header: "Value",
            render: (row) => (
              <span className="font-semibold text-emerald-400">
                {fmtValue(Number(row["value"] ?? 0))}
              </span>
            ),
          },
          {
            key: "status",
            header: "Status",
            render: (row) => (
              <Badge
                label={String(row["status"] ?? "—")}
                variant={dealBadgeVariant(String(row["status"] ?? ""))}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
