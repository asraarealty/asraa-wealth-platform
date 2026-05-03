"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getAdminClients } from "@/lib/services/clientService";
import { toggleClientStatus, toErrorMessage } from "@/lib/api";
import type { AdminClient } from "@/lib/api";
import Table from "@/components/ui/Table";
import Loader from "@/components/ui/Loader";
import ErrorState from "@/components/ui/ErrorState";
import EmptyState from "@/components/ui/EmptyState";

export default function ClientsPage() {
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
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
        console.error("[ClientsPage] Failed to load clients:", err);
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

  const filtered = search
    ? clients.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.email.toLowerCase().includes(search.toLowerCase()) ||
          c.phone?.includes(search)
      )
    : clients;

  return (
    <div className="space-y-6 text-white">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#c9a227" }}>
            Clients
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {clients.length} total client{clients.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* ✅ FIXED: Next.js Link instead of <a> */}
        <Link
          href="/admin/clients/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl text-black transition-opacity hover:opacity-90"
          style={{
            background: "linear-gradient(90deg, #C9A227, #d4af4a)",
            boxShadow: "0 2px 10px rgba(201,162,39,0.3)",
          }}
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Client
        </Link>
      </div>

      {/* SEARCH */}
      <div>
        <div className="relative w-72">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="rgba(201,162,39,0.5)"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
            />
          </svg>

          <input
            type="text"
            placeholder="Search by name, email or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-1"
            style={{
              background: "rgba(11,61,46,0.6)",
              border: "1px solid rgba(201,162,39,0.2)",
            }}
          />
        </div>
      </div>

      {/* TABLE / EMPTY */}
      {filtered.length === 0 ? (
        <EmptyState
          title="No clients found"
          description={
            search
              ? "Try a different search term."
              : "Add your first client to get started."
          }
          action={
            !search ? (
              <Link
                href="/admin/clients/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-black"
                style={{
                  background: "linear-gradient(90deg, #C9A227, #d4af4a)",
                }}
              >
                + Add Client
              </Link>
            ) : undefined
          }
        />
      ) : (
        <Table<AdminClient>
          keyField="id"
          rows={filtered}
          columns={[
            { key: "name", header: "Name" },
            { key: "email", header: "Email" },
            { key: "phone", header: "Phone" },
            {
              key: "isActive",
              header: "Status",
              render: (row) => (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold"
                  style={
                    row.isActive
                      ? {
                          background: "rgba(46,204,113,0.12)",
                          color: "#2ecc71",
                        }
                      : {
                          background: "rgba(148,163,184,0.12)",
                          color: "#94a3b8",
                        }
                  }
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: row.isActive ? "#2ecc71" : "#94a3b8",
                    }}
                  />
                  {row.isActive ? "Active" : "Inactive"}
                </span>
              ),
            },
            {
              key: "id",
              header: "Actions",
              render: (row) => (
                <button
                  onClick={() => handleToggle(row)}
                  disabled={toggling === row.id}
                  className="px-3 py-1 text-xs font-semibold rounded-lg transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={
                    row.isActive
                      ? {
                          background: "rgba(239,68,68,0.12)",
                          color: "#ef4444",
                          border: "1px solid rgba(239,68,68,0.25)",
                        }
                      : {
                          background: "rgba(46,204,113,0.12)",
                          color: "#2ecc71",
                          border: "1px solid rgba(46,204,113,0.25)",
                        }
                  }
                >
                  {toggling === row.id
                    ? "…"
                    : row.isActive
                    ? "Deactivate"
                    : "Activate"}
                </button>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
