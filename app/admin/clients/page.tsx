"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getAdminClients } from "@/lib/services/clientService";
import { toggleClientStatus, toErrorMessage } from "@/lib/api";
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
  const [toggling, setToggling] = useState<number | null>(null);
  const acRef = useRef<AbortController | null>(null);

  const loadClients = useCallback(() => {
    acRef.current?.abort();
    const ac = new AbortController();
    acRef.current = ac;
    setLoading(true);
    setError(null);
    getAdminClients(ac.signal)
      .then(setClients)
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(toErrorMessage(err));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadClients();
    return () => acRef.current?.abort();
  }, [loadClients]);

  async function handleToggle(client: AdminClient) {
    setToggling(client.id);
    try {
      await toggleClientStatus(client.id, !client.isActive);
      loadClients();
    } catch (err) {
      console.error("[ClientsPage] Failed to toggle client status:", err);
    } finally {
      setToggling(null);
    }
  }

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
            name="client-search"
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
                    className="transition-colors hover:bg-white/[0.03] cursor-pointer"
                    style={{
                      borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.04)" : undefined,
                    }}
                    onClick={() => window.location.href = `/admin/portfolio?clientId=${client.id}`}
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
                    <td className="px-4 py-3 text-right text-gray-400 hidden lg:table-cell">₹0</td>

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
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {/* WhatsApp */}
                        {client.phone && (
                          <a
                            href={`https://wa.me/91${client.phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="WhatsApp"
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg transition-all hover:scale-110"
                            style={{ background: "rgba(37,211,102,0.1)", color: "#25D366", border: "1px solid rgba(37,211,102,0.2)" }}
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                            </svg>
                          </a>
                        )}
                        {/* Call */}
                        {client.phone && (
                          <a
                            href={`tel:${client.phone}`}
                            title="Call"
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg transition-all hover:scale-110"
                            style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.2)" }}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                            </svg>
                          </a>
                        )}
                        {/* Email */}
                        <a
                          href={`mailto:${client.email}`}
                          title="Email"
                          className="inline-flex items-center justify-center w-7 h-7 rounded-lg transition-all hover:scale-110"
                          style={{ background: "rgba(201,162,39,0.1)", color: "#c9a227", border: "1px solid rgba(201,162,39,0.2)" }}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                          </svg>
                        </a>
                        <Link
                          href={`/admin/portfolio?clientId=${client.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg font-medium transition-all hover:opacity-90"
                          style={{ background: "rgba(167,139,250,0.1)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.2)" }}
                        >
                          Portfolio
                        </Link>
                        <button
                          onClick={() => handleToggle(client)}
                          disabled={toggling === client.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg font-medium transition-all hover:opacity-90 disabled:opacity-50"
                          style={
                            client.isActive
                              ? { background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }
                              : { background: "rgba(46,204,113,0.1)", color: "#2ecc71", border: "1px solid rgba(46,204,113,0.2)" }
                          }
                        >
                          {toggling === client.id ? "…" : client.isActive ? "Deactivate" : "Activate"}
                        </button>
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
