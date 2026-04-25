"use client";

import { useEffect, useState } from "react";
import { fetcher } from "@/lib/fetcher";
import type { AdminClient } from "@/lib/api";
import Table from "@/components/ui/Table";
import Loader from "@/components/ui/Loader";
import ErrorState from "@/components/ui/ErrorState";

export default function ClientsPage() {
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const ac = new AbortController();
    fetcher<AdminClient[]>("/clients", { signal: ac.signal })
      .then((data) => setClients(Array.isArray(data) ? data : []))
      .catch((err) => {
        if (err.name === "AbortError") return;
        console.error("Failed to load clients:", err);
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

  const filtered = search
    ? clients.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.email.toLowerCase().includes(search.toLowerCase()) ||
          c.phone?.includes(search)
      )
    : clients;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-100">Clients</h1>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name, email or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>
      {filtered.length === 0 ? (
        <p className="text-slate-400">No clients match your search.</p>
      ) : (
        <Table<AdminClient>
          keyField="id"
          rows={filtered}
          columns={[
            { key: "name", header: "Name" },
            { key: "email", header: "Email" },
            { key: "phone", header: "Phone" },
          ]}
        />
      )}
    </div>
  );
}
