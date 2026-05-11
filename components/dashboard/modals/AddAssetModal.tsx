"use client";

import { useState } from "react";
import type { CreateAssetPayload, UpdateAssetPayload } from "@/lib/api";
import Modal from "./Modal";
import StockModal from "./StockModal";
import MFModal from "./MFModal";
import RealEstateModal from "./RealEstateModal";
import CommodityModal from "./CommodityModal";

type TypeChoice = "stock" | "mf" | "property" | "commodity";

interface TypeOption {
  id: TypeChoice;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const TYPES: TypeOption[] = [
  {
    id: "stock",
    label: "Stock",
    description: "Equities & ETFs",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.307a11.95 11.95 0 0 1 5.814-5.519l2.74-1.22m0 0-5.94-2.28m5.94 2.28-2.28 5.941" />
      </svg>
    ),
  },
  {
    id: "mf",
    label: "Mutual Fund",
    description: "AMFI schemes & SIPs",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5m.75-9 3-3 2.148 2.148A12.061 12.061 0 0 1 16.5 7.605" />
      </svg>
    ),
  },
  {
    id: "commodity",
    label: "Commodity",
    description: "Gold, silver, crude, gas, copper",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m7.5-9h-15m12.75-6.75-10.5 13.5m0-13.5 10.5 13.5" />
      </svg>
    ),
  },
  {
    id: "property",
    label: "Real Estate",
    description: "Properties & land",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
];

interface AddAssetModalProps {
  onClose: () => void;
  onSave: (payload: CreateAssetPayload) => Promise<void>;
}

export default function AddAssetModal({ onClose, onSave }: AddAssetModalProps) {
  const [type, setType] = useState<TypeChoice | null>(null);

  // Once a type is chosen, hand off to the appropriate sub-modal.
  // Passing onClose directly means the sub-modal's Cancel button dismisses
  // the whole flow, and its Save calls onSave then the parent closes.
  // AddAssetModal is always in "add" mode: sub-modals will only ever call
  // onSave with a complete CreateAssetPayload, so the wider union type they
  // declare is safe to bridge here.
  const onSaveUnion = onSave as (
    payload: CreateAssetPayload | UpdateAssetPayload
  ) => Promise<void>;

  if (type === "stock") {
    return <StockModal onClose={onClose} onSave={onSaveUnion} />;
  }
  if (type === "mf") {
    return <MFModal onClose={onClose} onSave={onSaveUnion} />;
  }
  if (type === "property") {
    return <RealEstateModal onClose={onClose} onSave={onSaveUnion} />;
  }
  if (type === "commodity") {
    return <CommodityModal onClose={onClose} onSave={onSaveUnion} />;
  }

  return (
    <Modal title="Add Asset" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-gray-400">
          Select the type of asset you want to add to this portfolio.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              className="flex flex-col items-center gap-3 p-4 rounded-2xl text-center transition-all modal-type-option"
            >
              <span className="text-[#c9a227]">{t.icon}</span>
              <div>
                <p className="text-sm font-semibold text-white">{t.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
