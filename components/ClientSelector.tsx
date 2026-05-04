"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getClients } from "@/lib/services/clientService";
import { toErrorMessage } from "@/lib/fetcher";
import type { Client } from "@/lib/api";

interface ClientSelectorProps {
  selectedId: number | null;
  onChange: (client: Client) => void;
  /** When set, automatically selects the matching client once the list loads. */
  autoSelectId?: number | null;
}

export default function ClientSelector({
  selectedId,
  onChange,
  autoSelectId,
}: ClientSelectorProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const autoSelected = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedClient = clients.find((c) => c.id === selectedId) ?? null;

  const load = useCallback((): AbortController => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    getClients(controller.signal)
      .then((data) => {
        setClients(data);
        if (autoSelectId !== null && autoSelectId !== undefined && !autoSelected.current) {
          const match = data.find((c) => c.id === autoSelectId);
          if (match) {
            autoSelected.current = true;
            onChange(match);
          }
        }
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(toErrorMessage(err));
      })
      .finally(() => {
        setLoading(false);
      });

    return controller;
  }, [autoSelectId, onChange]);

  useEffect(() => {
    const controller = load();
    return () => controller.abort();
  }, [load]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.email.toLowerCase().includes(query.toLowerCase())
  );

  function handleSelect(client: Client) {
    onChange(client);
    setQuery("");
    setOpen(false);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm py-4" style={{ color: "rgba(201,162,39,0.6)" }}>
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" style={{ color: "#c9a227" }}>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
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
          style={{ color: "#c9a227", background: "rgba(201,162,39,0.1)", border: "1px solid rgba(201,162,39,0.2)" }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Combobox trigger */}
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setQuery("");
        }}
        className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm rounded-xl transition focus:outline-none"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(201,162,39,0.2)",
          color: selectedClient ? "white" : "rgba(255,255,255,0.35)",
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {selectedClient ? (
            <>
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: "rgba(201,162,39,0.15)", color: "#c9a227", border: "1px solid rgba(201,162,39,0.2)" }}
              >
                {selectedClient.name.charAt(0).toUpperCase()}
              </div>
              <span className="truncate font-medium">{selectedClient.name}</span>
              <span className="text-xs shrink-0" style={{ color: "rgba(255,255,255,0.35)" }}>
                {selectedClient.email}
              </span>
            </>
          ) : (
            <span>Select a client…</span>
          )}
        </div>
        <svg
          className={`w-4 h-4 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="rgba(201,162,39,0.6)" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-50 mt-1.5 w-full rounded-xl shadow-2xl overflow-hidden"
          style={{
            background: "rgba(8,22,18,0.98)",
            border: "1px solid rgba(201,162,39,0.2)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          {/* Search input */}
          <div className="p-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="relative">
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
                fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.3)" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                autoFocus
                type="text"
                name="client-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or email…"
                className="w-full pl-8 pr-3 py-2 text-sm text-white placeholder-white/25 rounded-lg focus:outline-none"
                style={{ background: "rgba(255,255,255,0.05)" }}
              />
            </div>
          </div>

          {/* Options */}
          <ul className="max-h-72 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-center" style={{ color: "rgba(255,255,255,0.3)" }}>
                No clients found
              </li>
            ) : (
              filtered.map((client) => {
                const isSelected = client.id === selectedId;
                return (
                  <li key={client.id}>
                    <button
                      type="button"
                      onClick={() => handleSelect(client)}
                      className="w-full text-left px-4 py-3 transition flex items-center gap-2.5"
                      style={{
                        background: isSelected ? "rgba(201,162,39,0.12)" : "transparent",
                        borderLeft: isSelected ? "3px solid #c9a227" : "3px solid transparent",
                        color: "rgba(255,255,255,0.8)",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.background = "rgba(201,162,39,0.07)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: "rgba(201,162,39,0.15)", color: "#c9a227", border: "1px solid rgba(201,162,39,0.2)" }}
                      >
                        {client.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate text-white">{client.name}</div>
                        <div className="text-xs truncate" style={{ color: "rgba(255,255,255,0.35)" }}>{client.email}</div>
                      </div>
                      <span
                        className="shrink-0 text-xs px-2 py-0.5 rounded-full"
                        style={
                          client.isActive
                            ? { background: "rgba(46,204,113,0.1)", color: "#2ecc71", border: "1px solid rgba(46,204,113,0.2)" }
                            : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.1)" }
                        }
                      >
                        {client.isActive ? "Active" : "Inactive"}
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
