"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAdminClients } from "@/lib/services/clientService";
import { toErrorMessage } from "@/lib/fetcher";
import type { AdminClient } from "@/lib/api";
import Loader from "@/components/ui/Loader";
import ErrorState from "@/components/ui/ErrorState";

type Filter = "all" | "active" | "inactive";

export default function ClientsPage() {
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    const ac = new AbortController();
    getAdminClients(ac.signal)
      .then(setClients)
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(toErrorMessage(err));
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  if (loading) return <Loader />;
  if (error) return <ErrorState message={error} />;

  const filtered = clients.filter((c) => {
    const matchSearch = !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search);
    const matchFilter =
      filter === "all" ||
      (filter === "active" && c.isActive) ||
      (filter === "inactive" && !c.isActive);
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-6 text-white">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Clients</h1>
          <p className="text-sm text-gray-400 mt-1">
            {clients.length} total · {clients.filter(c => c.isActive).length} active
          </p>
        </div>
        <Link
          href="/admin/clients/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl text-black transition-opacity hover:opacity-90"
          style={{
            background: "linear-gradient(90deg, #C9A227, #d4af4a)",
            boxShadow: "0 2px 10px rgba(201,162,39,0.3)",
          }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Client
        </Link>
      </div>

      {/* Search + Filter row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-72">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, email or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          />
        </div>

        <div className="flex items-center gap-1 rounded-xl p-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {(["all", "active", "inactive"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all capitalize"
              style={
                filter === f
                  ? { background: "rgba(0,229,255,0.12)", color: "#00E5FF", border: "1px solid rgba(0,229,255,0.2)" }
                  : { color: "rgba(156,163,175,0.8)" }
              }
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div
          className="glass-card rounded-2xl p-12 text-center"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <p className="text-white font-medium">No clients found</p>
          <p className="text-sm text-gray-500 mt-1">
            {search ? "Try a different search term." : "Add your first client to get started."}
          </p>
        </div>
      ) : (
        <div
          className="glass-card rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-widest font-semibold" style={{ color: "rgba(0,229,255,0.6)" }}>Name</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-widest font-semibold hidden md:table-cell" style={{ color: "rgba(0,229,255,0.6)" }}>Email</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-widest font-semibold hidden sm:table-cell" style={{ color: "rgba(0,229,255,0.6)" }}>Phone</th>
                  <th className="px-4 py-3 text-right text-xs uppercase tracking-widest font-semibold hidden lg:table-cell" style={{ color: "rgba(0,229,255,0.6)" }}>Portfolio Value</th>
                  <th className="px-4 py-3 text-center text-xs uppercase tracking-widest font-semibold" style={{ color: "rgba(0,229,255,0.6)" }}>Status</th>
                  <th className="px-4 py-3 text-right text-xs uppercase tracking-widest font-semibold" style={{ color: "rgba(0,229,255,0.6)" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((client, i) => (
                  <tr
                    key={client.id}
                    className="transition-colors hover:bg-white/[0.02]"
                    style={{
                      borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.04)" : undefined,
                    }}
                  >
                    {/* Name with avatar */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                          style={{ background: "rgba(201,162,39,0.15)", color: "#C9A227", border: "1px solid rgba(201,162,39,0.2)" }}
                        >
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-white">{client.name}</span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{client.email}</td>

                    {/* Phone */}
                    <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">
                      {client.phone ?? "—"}
                    </td>

                    {/* Portfolio Value */}
                    <td className="px-4 py-3 text-right text-gray-400 hidden lg:table-cell">—</td>

                    {/* Status */}
                    <td className="px-4 py-3 text-center">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                        style={
                          client.isActive
                            ? { background: "rgba(46,204,113,0.12)", color: "#2ecc71", border: "1px solid rgba(46,204,113,0.2)" }
                            : { background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }
                        }
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: client.isActive ? "#2ecc71" : "#ef4444" }}
                        />
                        {client.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href="/admin/portfolio"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg font-medium transition-all hover:opacity-90"
                          style={{ background: "rgba(167,139,250,0.1)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.2)" }}
                        >
                          Portfolio
                        </Link>
                        <Link
                          href="/admin/assets"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg font-medium transition-all hover:opacity-90"
                          style={{ background: "rgba(0,229,255,0.08)", color: "#00E5FF", border: "1px solid rgba(0,229,255,0.2)" }}
                        >
                          Assets
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
