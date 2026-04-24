"use client";

import { useEffect, useState } from "react";
import { fetcher } from "@/lib/fetcher";
import type { Lead } from "@/lib/api";
import Table from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import Loader from "@/components/ui/Loader";
import ErrorState from "@/components/ui/ErrorState";

function leadBadgeVariant(
  status: string
): "blue" | "yellow" | "green" | "gray" {
  const s = status?.toLowerCase();
  if (s === "new") return "blue";
  if (s === "contacted") return "yellow";
  if (s === "closed") return "green";
  return "gray";
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    fetcher<Lead[]>("/leads", { signal: ac.signal })
      .then(setLeads)
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error("Failed to load leads:", err);
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
      <h1 className="mb-6 text-2xl font-bold text-slate-100">Leads</h1>
      <Table<Lead>
        keyField="id"
        rows={leads}
        columns={[
          { key: "name", header: "Name" },
          { key: "source", header: "Source" },
          {
            key: "status",
            header: "Status",
            render: (row) => (
              <Badge
                label={row.status ?? "—"}
                variant={leadBadgeVariant(row.status ?? "")}
              />
            ),
          },
        ]}
      />
    </div>
  );
}
