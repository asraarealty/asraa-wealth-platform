"use client";

import { useState, useEffect, useCallback } from "react";
import { getClients } from "@/lib/services/clientService";
import { toErrorMessage } from "@/lib/fetcher";
import type { Client } from "@/lib/api";

interface ClientSelectorProps {
  selectedId: number | null;
  onChange: (client: Client) => void;
}

export default function ClientSelector({
  selectedId,
  onChange,
}: ClientSelectorProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const load = useCallback((): AbortController => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    getClients(controller.signal)
      .then((data) => {
        setClients(data);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(toErrorMessage(err));
      })
      .finally(() => {
        setLoading(false);
      });

    return controller;
  }, []);

  useEffect(() => {
    const controller = load();
    return () => controller.abort();
  }, [load]);

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(filter.toLowerCase()) ||
      c.email.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm py-4" style={{ color: "rgba(201,162,39,0.6)" }}>
        <svg
          className="animate-spin h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          style={{ color: "#c9a227" }}
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        Loading clients…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-2 py-2">
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={load}
          className="text-sm font-medium text-left px-3 py-1.5 rounded-lg transition"
          style={{
            color: "#c9a227",
            background: "rgba(201,162,39,0.1)",
            border: "1px solid rgba(201,162,39,0.2)",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter clients…"
        className="w-full px-4 py-2 text-sm text-white placeholder-white/30 rounded-lg transition focus:outline-none"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(201,162,39,0.2)",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "rgba(201,162,39,0.5)";
          e.currentTarget.style.boxShadow = "0 0 0 2px rgba(201,162,39,0.15)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "rgba(201,162,39,0.2)";
          e.currentTarget.style.boxShadow = "none";
        }}
      />

      <ul className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
        {filtered.length === 0 && (
          <li className="text-sm py-2 text-center" style={{ color: "rgba(255,255,255,0.3)" }}>
            No clients found
          </li>
        )}
        {filtered.map((client) => {
          const isSelected = client.id === selectedId;
          return (
            <li key={client.id}>
              <button
                onClick={() => onChange(client)}
                className="w-full text-left rounded-xl px-4 py-3 transition"
                style={
                  isSelected
                    ? {
                        background: "rgba(201,162,39,0.12)",
                        borderLeft: "3px solid #c9a227",
                        border: "1px solid rgba(201,162,39,0.25)",
                        color: "white",
                      }
                    : {
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.06)",
                        color: "rgba(255,255,255,0.75)",
                      }
                }
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "rgba(201,162,39,0.07)";
                    e.currentTarget.style.borderColor = "rgba(201,162,39,0.15)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                  }
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{client.name}</div>
                    <div className="text-xs truncate" style={{ color: "rgba(255,255,255,0.35)" }}>
                      {client.email}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <span
                      className="inline-block text-xs px-2 py-0.5 rounded-full"
                      style={
                        client.is_active
                          ? {
                              background: "rgba(46,204,113,0.1)",
                              color: "#2ecc71",
                              border: "1px solid rgba(46,204,113,0.2)",
                            }
                          : {
                              background: "rgba(255,255,255,0.05)",
                              color: "rgba(255,255,255,0.35)",
                              border: "1px solid rgba(255,255,255,0.1)",
                            }
                      }
                    >
                      {client.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

