"use client";

import { useState, useEffect } from "react";
import { fetchClients, type Client } from "@/lib/api";

interface ClientSelectorProps {
  selectedId: string | null;
  onChange: (client: Client) => void;
}

const RISK_BADGE: Record<Client["risk_profile"], string> = {
  conservative: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  moderate: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  aggressive: "bg-red-500/10 text-red-400 border-red-500/20",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export default function ClientSelector({
  selectedId,
  onChange,
}: ClientSelectorProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetchClients()
      .then(setClients)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load clients")
      )
      .finally(() => setLoading(false));
  }, []);

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(filter.toLowerCase()) ||
      c.email.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-sm py-4">
        <svg
          className="animate-spin h-4 w-4 text-emerald-400"
          fill="none"
          viewBox="0 0 24 24"
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
      <p className="text-red-400 text-sm py-2">{error}</p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filter clients…"
        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
      />

      <ul className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
        {filtered.length === 0 && (
          <li className="text-gray-500 text-sm py-2 text-center">
            No clients found
          </li>
        )}
        {filtered.map((client) => {
          const isSelected = client.id === selectedId;
          return (
            <li key={client.id}>
              <button
                onClick={() => onChange(client)}
                className={`w-full text-left rounded-xl px-4 py-3 transition border ${
                  isSelected
                    ? "bg-emerald-600/10 border-emerald-500/30 text-white"
                    : "bg-gray-800/60 border-gray-700/50 hover:bg-gray-800 text-gray-200"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">
                      {client.name}
                    </div>
                    <div className="text-xs text-gray-400 truncate">
                      {client.email}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold text-white">
                      {formatCurrency(client.portfolio_value)}
                    </div>
                    <span
                      className={`inline-block text-xs px-2 py-0.5 rounded-full border capitalize ${
                        RISK_BADGE[client.risk_profile]
                      }`}
                    >
                      {client.risk_profile}
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
