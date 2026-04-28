"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { getPortfolioItems } from "@/lib/services/portfolioService";
import { toErrorMessage, fetcher } from "@/lib/fetcher";
import ClientSelector from "./ClientSelector";
import StockSearch from "./StockSearch";
import PortfolioGrowthChart from "./dashboard/PortfolioGrowthChart";
import AllocationChart from "./dashboard/AllocationChart";
import AIInsightsPanel from "./dashboard/AIInsightsPanel";

type Client = any;
type Portfolio = any;
type StockQuote = any;

export default function Dashboard({
  clientId,
}: {
  clientId?: string;
}) {
  const { logout, user } = useAuth();

  const [selectedClient, setSelectedClient] =
    useState<Client | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStock, setSelectedStock] =
    useState<StockQuote | null>(null);

  const [showStockModal, setShowStockModal] = useState(false);
  const [showMFModal, setShowMFModal] = useState(false);
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [form, setForm] = useState<any>({});

  const isAdmin =
    String(user?.role).toLowerCase() === "admin";

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

  async function handleSave(type: string) {
    let endpoint = "";
    if (type === "stock") endpoint = "/stocks";
    if (type === "mf") endpoint = "/mutual-funds";
    if (type === "property") endpoint = "/properties";

    await fetcher(endpoint, {
      method: "POST",
      body: form,
    });

    loadPortfolio(selectedClient?.id);
    setShowStockModal(false);
    setShowMFModal(false);
    setShowPropertyModal(false);
    setForm({});
  }

  return (
    <div className="min-h-screen text-white bg-[#071a14] p-6 space-y-6">

      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Dashboard</h1>
        <button onClick={logout}>Logout</button>
      </div>

      <div className="flex gap-3">
        <button onClick={() => setShowStockModal(true)}>+ Stock</button>
        <button onClick={() => setShowMFModal(true)}>+ MF</button>
        <button onClick={() => setShowPropertyModal(true)}>+ Property</button>
      </div>

      {isAdmin && (
        <ClientSelector
          selectedId={selectedClient?.id ?? null}
          onChange={setSelectedClient}
        />
      )}

      <StockSearch onSelect={setSelectedStock} />

      {loading && <p>Loading...</p>}
      {error && <p>{error}</p>}

      <div>Total: ₹ {kpis.totalValue}</div>

      {showStockModal && (
        <Modal title="Add Stock" onClose={() => setShowStockModal(false)}>
          <input onChange={(e) => setForm({ ...form, ticker: e.target.value })} />
          <button onClick={() => handleSave("stock")}>Save</button>
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, title, onClose }: any) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
      <div className="bg-black p-4 rounded">
        <h2>{title}</h2>
        {children}
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
