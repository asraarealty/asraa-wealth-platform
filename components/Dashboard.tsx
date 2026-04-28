"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getPortfolioItems } from "@/lib/services/portfolioService";
import { toErrorMessage, fetcher } from "@/lib/fetcher";
import ClientSelector from "./ClientSelector";
import StockSearch from "./StockSearch";
import PortfolioGrowthChart from "./dashboard/PortfolioGrowthChart";
import AllocationChart from "./dashboard/AllocationChart";
import AIInsightsPanel from "./dashboard/AIInsightsPanel";

/* TYPES */
type Client = any;
type Portfolio = any;
type PortfolioMeta = any;
type StockQuote = any;

/* HELPERS */

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function computeKPIs(items: Portfolio[]) {
  const totalValue = items.reduce((s, p) => s + p.value, 0);
  const totalCost = items.reduce(
    (s, p) => s + p.avg_price * p.quantity,
    0
  );
  const totalGain = totalValue - totalCost;
  const gainPercent =
    totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  return {
    totalValue,
    totalCost,
    totalGain,
    gainPercent,
    positionCount: items.length,
  };
}

/* COMPONENT */

export default function Dashboard() {
  const { logout, user } = useAuth();
  const searchParams = useSearchParams();

  const [selectedClient, setSelectedClient] =
    useState<Client | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio[]>([]);
  const [portfolioMeta, setPortfolioMeta] =
    useState<Partial<PortfolioMeta>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStock, setSelectedStock] =
    useState<StockQuote | null>(null);

  // 🔥 modal states
  const [showStockModal, setShowStockModal] = useState(false);
  const [showMFModal, setShowMFModal] = useState(false);
  const [showPropertyModal, setShowPropertyModal] = useState(false);

  const [form, setForm] = useState<any>({});

  const kpis = useMemo(
    () => computeKPIs(portfolio),
    [portfolio]
  );

  const isAdmin =
    String(user?.role).toLowerCase() === "admin";

  const clientIdFromUrl = searchParams.get("client_id");

  /* LOAD PORTFOLIO */

  const loadPortfolio = useCallback(
    async (clientId?: number) => {
      setLoading(true);
      setError(null);

      try {
        const { items, meta } = await getPortfolioItems(
          isAdmin ? clientId : undefined
        );

        setPortfolio(items || []);
        setPortfolioMeta(meta || {});
      } catch (err) {
        setError(toErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [isAdmin]
  );

  /* 🔥 FULL CONTROL LOGIC */

  useEffect(() => {
    if (!user) return;

    if (isAdmin) {
      const id = clientIdFromUrl
        ? Number(clientIdFromUrl)
        : selectedClient?.id;

      if (id) loadPortfolio(id);
    } else {
      loadPortfolio();
    }
  }, [clientIdFromUrl, selectedClient, loadPortfolio, user, isAdmin]);

  async function handleLogout() {
    await logout();
  }

  /* 🔥 SAVE FUNCTIONS */

  async function handleSave(type: string) {
    try {
      let endpoint = "";

      if (type === "stock") endpoint = "/stocks";
      if (type === "mf") endpoint = "/mutual-funds";
      if (type === "property") endpoint = "/properties";

      await fetcher(endpoint, {
        method: "POST",
        body: form,
      });

      // refresh
      loadPortfolio(selectedClient?.id);

      setShowStockModal(false);
      setShowMFModal(false);
      setShowPropertyModal(false);
      setForm({});
    } catch (err) {
      alert(toErrorMessage(err));
    }
  }

  return (
    <div className="min-h-screen text-white bg-[#071a14] p-6 space-y-6">

      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 border border-white/20 rounded"
        >
          Logout
        </button>
      </div>

      {/* 🔥 ADD ACTIONS */}
      {user && (
        <div className="flex gap-3">
          <button onClick={() => setShowStockModal(true)}
            className="px-4 py-2 bg-yellow-500 text-black rounded">
            + Add Stock
          </button>
          <button onClick={() => setShowMFModal(true)}
            className="px-4 py-2 bg-yellow-500 text-black rounded">
            + Add Mutual Fund
          </button>
          <button onClick={() => setShowPropertyModal(true)}
            className="px-4 py-2 bg-yellow-500 text-black rounded">
            + Add Property
          </button>
        </div>
      )}

      {/* Admin selector */}
      {isAdmin && (
        <ClientSelector
          selectedId={selectedClient?.id ?? null}
          onChange={setSelectedClient}
        />
      )}

      <StockSearch onSelect={setSelectedStock} />

      {selectedStock && (
        <div className="p-4 border border-yellow-500 rounded">
          {selectedStock.symbol} — {formatCurrency(selectedStock.price)}
        </div>
      )}

      {loading && <p>Loading...</p>}
      {error && <p className="text-red-400">{error}</p>}

      {portfolio.length > 0 && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>Total Value: {formatCurrency(kpis.totalValue)}</div>
            <div>Return: {formatPercent(kpis.gainPercent)}</div>
            <div>Invested: {formatCurrency(kpis.totalCost)}</div>
            <div>Holdings: {kpis.positionCount}</div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <PortfolioGrowthChart
              totalValue={kpis.totalValue}
              gainPercent={kpis.gainPercent}
            />
            <AllocationChart positions={portfolio} />
          </div>

          <AIInsightsPanel />
        </>
      )}

      {/* 🔥 MODALS */}

      {showStockModal && (
        <Modal title="Add Stock" onClose={() => setShowStockModal(false)}>
          <input placeholder="Symbol"
            onChange={(e) => setForm({ ...form, ticker: e.target.value })} />
          <input placeholder="Quantity"
            onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
          <input placeholder="Avg Price"
            onChange={(e) => setForm({ ...form, avg_price: Number(e.target.value) })} />
          <button onClick={() => handleSave("stock")}>Save</button>
        </Modal>
      )}

      {showMFModal && (
        <Modal title="Add Mutual Fund" onClose={() => setShowMFModal(false)}>
          <input placeholder="MF Code"
            onChange={(e) => setForm({ ...form, mf_code: e.target.value })} />
          <input placeholder="Units"
            onChange={(e) => setForm({ ...form, units: Number(e.target.value) })} />
          <button onClick={() => handleSave("mf")}>Save</button>
        </Modal>
      )}

      {showPropertyModal && (
        <Modal title="Add Property" onClose={() => setShowPropertyModal(false)}>
          <input placeholder="Title"
            onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input placeholder="Value"
            onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
          <button onClick={() => handleSave("property")}>Save</button>
        </Modal>
      )}

    </div>
  );
}

/* SIMPLE MODAL */
function Modal({ children, title, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
      <div className="bg-[#0A0F0D] p-6 rounded space-y-3 w-80">
        <h2>{title}</h2>
        {children}
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
