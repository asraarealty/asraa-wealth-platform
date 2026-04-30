"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { getPortfolioItems } from "@/lib/services/portfolioService";
import { toErrorMessage } from "@/lib/fetcher";
import { createPortfolioItem } from "@/lib/api";
import ClientSelector from "./ClientSelector";
import StockSearch from "./StockSearch";
import PortfolioGrowthChart from "./dashboard/PortfolioGrowthChart";
import AllocationChart from "./dashboard/AllocationChart";
import AIInsightsPanel from "./dashboard/AIInsightsPanel";

/* TYPES */
type Client = any;
type Portfolio = any;
type StockQuote = any;

export default function Dashboard({
  clientId,
}: {
  clientId?: string;
}) {
  const { logout, user } = useAuth();

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStock, setSelectedStock] = useState<StockQuote | null>(null);

  // 🔥 modal states
  const [showStockModal, setShowStockModal] = useState(false);
  const [showMFModal, setShowMFModal] = useState(false);
  const [showPropertyModal, setShowPropertyModal] = useState(false);

  const [form, setForm] = useState<any>({});

  const isAdmin = String(user?.role).toLowerCase() === "admin";

  /* KPI */
  const kpis = useMemo(() => {
    const totalValue = portfolio.reduce((s, p) => s + p.value, 0);
    const totalCost = portfolio.reduce(
      (s, p) => s + p.avg_price * p.quantity,
      0
    );
    const gainPercent =
      totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;

    return {
      totalValue,
      totalCost,
      gainPercent,
      positionCount: portfolio.length,
    };
  }, [portfolio]);

  /* LOAD PORTFOLIO */
  const loadPortfolio = useCallback(
    async (id?: number) => {
      setLoading(true);
      setError(null);

      try {
        const { items } = await getPortfolioItems(
          isAdmin ? id : undefined
        );
        setPortfolio(items || []);
      } catch (err) {
        setError(toErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [isAdmin]
  );

  /* MAIN LOGIC */
  useEffect(() => {
    if (!user) return;

    if (isAdmin) {
      const id = clientId
        ? Number(clientId)
        : selectedClient?.id;

      if (id) loadPortfolio(id);
    } else {
      loadPortfolio();
    }
  }, [clientId, selectedClient, user, isAdmin, loadPortfolio]);

  async function handleLogout() {
    await logout();
  }

  function openStockModal() {
    setForm({});
    setShowStockModal(true);
  }

  function openMFModal() {
    setForm({});
    setShowMFModal(true);
  }

  function openPropertyModal() {
    setForm({});
    setShowPropertyModal(true);
  }

  /* SAVE */
  async function handleSave(type: string) {
    try {
      const clientOpts = isAdmin && selectedClient?.id ? { user_id: selectedClient.id } : {};

      if (type === "stock") {
        const symbol = (form.symbol ?? "").trim().toUpperCase();
        const name = (form.name ?? "").trim();
        const quantity = Number(form.quantity);
        const avg_price = Number(form.avg_price);

        if (!symbol) { alert("Symbol is required"); return; }
        if (!name) { alert("Name is required"); return; }
        if (!Number.isFinite(quantity) || quantity <= 0) { alert("Valid quantity is required"); return; }
        if (!Number.isFinite(avg_price) || avg_price <= 0) { alert("Valid average price is required"); return; }

        await createPortfolioItem({ symbol, name, quantity, avg_price, ...clientOpts });
      } else if (type === "mf") {
        const symbol = (form.mf_code ?? "").trim().toUpperCase();
        const name = (form.name ?? "").trim();
        const quantity = Number(form.units);
        const avg_price = Number(form.avg_price);

        if (!symbol) { alert("MF Code is required"); return; }
        if (!name) { alert("Name is required"); return; }
        if (!Number.isFinite(quantity) || quantity <= 0) { alert("Valid units is required"); return; }
        if (!Number.isFinite(avg_price) || avg_price <= 0) { alert("Valid NAV / price is required"); return; }

        await createPortfolioItem({ symbol, name, quantity, avg_price, ...clientOpts });
      } else if (type === "property") {
        const symbol = (form.symbol ?? "PROP").trim().toUpperCase();
        const name = (form.title ?? "").trim();
        const avg_price = Number(form.value);

        if (!name) { alert("Title is required"); return; }
        if (!Number.isFinite(avg_price) || avg_price <= 0) { alert("Valid value is required"); return; }

        await createPortfolioItem({ symbol, name, quantity: 1, avg_price, ...clientOpts });
      }

      await loadPortfolio(selectedClient?.id);

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

      {/* ACTIONS */}
      {user && (
        <div className="flex gap-3">
          <button onClick={openStockModal}
            className="px-4 py-2 bg-yellow-500 text-black rounded">
            + Add Stock
          </button>
          <button onClick={openMFModal}
            className="px-4 py-2 bg-yellow-500 text-black rounded">
            + Add Mutual Fund
          </button>
          <button onClick={openPropertyModal}
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

      {/* Stock search */}
      <StockSearch onSelect={setSelectedStock} />

      {selectedStock && (
        <div className="p-4 border border-yellow-500 rounded">
          {selectedStock.symbol} — ₹ {selectedStock.price}
        </div>
      )}

      {/* Loading/Error */}
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-400">{error}</p>}

      {/* Portfolio */}
      {portfolio.length > 0 && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>Total Value: ₹ {kpis.totalValue}</div>
            <div>Return: {kpis.gainPercent.toFixed(2)}%</div>
            <div>Invested: ₹ {kpis.totalCost}</div>
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

      {/* MODALS */}

      {showStockModal && (
        <Modal title="Add Stock" onClose={() => setShowStockModal(false)}>
          <input placeholder="Symbol (e.g. AAPL)"
            value={form.symbol ?? ""}
            onChange={(e) => setForm({ ...form, symbol: e.target.value })} />
          <input placeholder="Name (e.g. Apple Inc.)"
            value={form.name ?? ""}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Quantity" type="number" min="0"
            value={form.quantity ?? ""}
            onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          <input placeholder="Avg Price" type="number" min="0"
            value={form.avg_price ?? ""}
            onChange={(e) => setForm({ ...form, avg_price: e.target.value })} />
          <button onClick={() => handleSave("stock")}>Save</button>
        </Modal>
      )}

      {showMFModal && (
        <Modal title="Add Mutual Fund" onClose={() => setShowMFModal(false)}>
          <input placeholder="MF Code"
            value={form.mf_code ?? ""}
            onChange={(e) => setForm({ ...form, mf_code: e.target.value })} />
          <input placeholder="Name (e.g. HDFC Top 100)"
            value={form.name ?? ""}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Units" type="number" min="0"
            value={form.units ?? ""}
            onChange={(e) => setForm({ ...form, units: e.target.value })} />
          <input placeholder="Avg NAV / Price" type="number" min="0"
            value={form.avg_price ?? ""}
            onChange={(e) => setForm({ ...form, avg_price: e.target.value })} />
          <button onClick={() => handleSave("mf")}>Save</button>
        </Modal>
      )}

      {showPropertyModal && (
        <Modal title="Add Property" onClose={() => setShowPropertyModal(false)}>
          <input placeholder="Symbol / ID (e.g. PROP-001)"
            value={form.symbol ?? ""}
            onChange={(e) => setForm({ ...form, symbol: e.target.value })} />
          <input placeholder="Title"
            value={form.title ?? ""}
            onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input placeholder="Current Value" type="number" min="0"
            value={form.value ?? ""}
            onChange={(e) => setForm({ ...form, value: e.target.value })} />
          <button onClick={() => handleSave("property")}>Save</button>
        </Modal>
      )}

    </div>
  );
}

/* MODAL */
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
