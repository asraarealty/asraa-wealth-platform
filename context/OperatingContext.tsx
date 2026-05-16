"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type TimeHorizon = "30d" | "90d" | "1y";
export type RiskProfile = "conservative" | "balanced" | "growth";
export type DensityMode = "comfortable" | "compact";

interface OperatingContextValue {
  selectedAccount: string;
  setSelectedAccount: (account: string) => void;
  timeHorizon: TimeHorizon;
  setTimeHorizon: (h: TimeHorizon) => void;
  riskProfile: RiskProfile;
  setRiskProfile: (r: RiskProfile) => void;
  density: DensityMode;
  setDensity: (d: DensityMode) => void;
}

const OperatingContext = createContext<OperatingContextValue | null>(null);

export function OperatingProvider({ children }: { children: ReactNode }) {
  const [selectedAccount, setSelectedAccount] = useState("my-portfolio");
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizon>("90d");
  const [riskProfile, setRiskProfile] = useState<RiskProfile>("balanced");
  const [density, setDensity] = useState<DensityMode>("comfortable");

  const value = useMemo(
    () => ({
      selectedAccount,
      setSelectedAccount,
      timeHorizon,
      setTimeHorizon,
      riskProfile,
      setRiskProfile,
      density,
      setDensity,
    }),
    [selectedAccount, timeHorizon, riskProfile, density]
  );

  return <OperatingContext.Provider value={value}>{children}</OperatingContext.Provider>;
}

export function useOperatingContext(): OperatingContextValue {
  const ctx = useContext(OperatingContext);
  if (!ctx) throw new Error("useOperatingContext must be used within OperatingProvider");
  return ctx;
}
