"use client";

import { useState } from "react";

interface Fund {
  id: number;
  name: string;
  invested: number;
  current: number;
}

export default function MutualFundsPage() {
  const [funds, setFunds] = useState<Fund[]>([]);
  const [name, setName] = useState("");
  const [invested, setInvested] = useState("");
  const [current, setCurrent] = useState("");

  function addFund() {
    if (!name || !invested || !current) return;

    const newFund: Fund = {
      id: Date.now(),
      name,
      invested: Number(invested),
      current: Number(current),
    };

    setFunds((prev) => [...prev, newFund]);

    setName("");
    setInvested("");
    setCurrent("");
  }

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-6">Mutual Funds</h1>

      {/* Add Fund Form */}
      <div className="bg-[#111] p-4 rounded-xl mb-6 space-y-3">
        <input
          placeholder="Fund Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-2 rounded bg-black/40"
        />

        <input
          placeholder="Invested Amount"
          type="number"
          value={invested}
          onChange={(e) => setInvested(e.target.value)}
          className="w-full p-2 rounded bg-black/40"
        />

        <input
          placeholder="Current Value"
          type="number"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className="w-full p-2 rounded bg-black/40"
        />

        <button
          onClick={addFund}
          className="bg-yellow-500 text-black px-4 py-2 rounded"
        >
          Add Fund
        </button>
      </div>

      {/* Table */}
      <div className="bg-[#111] rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-black/40">
            <tr>
              <th className="p-3">Fund</th>
              <th className="p-3">Invested</th>
              <th className="p-3">Current</th>
              <th className="p-3">Profit</th>
            </tr>
          </thead>
          <tbody>
            {funds.length === 0 && (
              <tr>
                <td className="p-3 text-gray-400" colSpan={4}>
                  No funds added yet
                </td>
              </tr>
            )}

            {funds.map((f) => {
              const profit = f.current - f.invested;

              return (
                <tr key={f.id} className="border-t border-gray-800">
                  <td className="p-3">{f.name}</td>
                  <td className="p-3">₹{f.invested}</td>
                  <td className="p-3">₹{f.current}</td>
                  <td
                    className={`p-3 ${
                      profit >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    ₹{profit}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
