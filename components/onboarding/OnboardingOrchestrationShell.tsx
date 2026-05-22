"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ONBOARDING_STEPS,
  PORTFOLIO_RUNTIME_STATES,
  clearOnboardingDraft,
  createDefaultOnboardingDraft,
  deriveLifecycleState,
  isProfileComplete,
  lifecycleProgress,
  loadOnboardingDraft,
  saveOnboardingDraft,
} from "@/domains/onboarding";
import type { OnboardingDraft, UploadQueueItem } from "@/domains/onboarding";
import { ActivationRevealStep } from "@/components/onboarding/steps/ActivationRevealStep";
import { AssetClassSelectionStep } from "@/components/onboarding/steps/AssetClassSelectionStep";
import { PortfolioImportStep } from "@/components/onboarding/steps/PortfolioImportStep";
import { ProfileWizardStep } from "@/components/onboarding/steps/ProfileWizardStep";
import { WelcomeStep } from "@/components/onboarding/steps/WelcomeStep";

const NBSP = "\u00A0";

function fmtCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function estimateNetWorth(range: string) {
  const map: Record<string, number> = {
    "Below ₹50L": 40_00_000,
    "₹50L - ₹2Cr": 1_20_00_000,
    "₹2Cr - ₹10Cr": 5_00_00_000,
    "₹10Cr - ₹25Cr": 15_00_00_000,
    "Above ₹25Cr": 30_00_00_000,
  };
  return map[range] ?? 1_20_00_000;
}

function buildActivationSnapshot(draft: OnboardingDraft) {
  const estimatedNetWorth = estimateNetWorth(draft.financial.netWorthRange);
  const propertyValue = draft.selectedAssetClasses.includes("property") ? estimatedNetWorth * 0.32 : estimatedNetWorth * 0.14;
  const unrealizedGain = estimatedNetWorth * (draft.financial.riskAppetite === "Aggressive" ? 0.13 : draft.financial.riskAppetite === "Growth" ? 0.09 : 0.06);
  const healthScore = draft.selectedAssetClasses.length >= 4 ? 88 : draft.selectedAssetClasses.length >= 2 ? 76 : 62;
  const riskScore = draft.financial.riskAppetite === "Aggressive" ? 82 : draft.financial.riskAppetite === "Growth" ? 68 : draft.financial.riskAppetite === "Balanced" ? 52 : 36;
  const allocationBase = draft.selectedAssetClasses.length > 0 ? Math.floor(100 / draft.selectedAssetClasses.length) : 0;
  const allocation = draft.selectedAssetClasses.length > 0 ? `${allocationBase}% across ${draft.selectedAssetClasses.length} categories` : `0%${NBSP}mapped`;

  const investorName = draft.identity.name.split(" ")[0] || "Client";
  const metrics = [
    { label: "Total Net Worth", value: fmtCurrency(estimatedNetWorth) },
    { label: "Portfolio Allocation", value: allocation },
    { label: "Unrealized Gains", value: fmtCurrency(unrealizedGain) },
    { label: "Property Value", value: fmtCurrency(propertyValue) },
    { label: "Health Score", value: `${healthScore}/100` },
    { label: "Risk Score", value: `${riskScore}/100` },
  ];

  const insights = [
    `${investorName}'s diversification profile is now mapped across selected asset classes.`,
    "Priority allocation drift alerts have been enabled for advisory review.",
    "Initial operating insights are ready to guide wealth growth and downside protection.",
  ];

  return { metrics, insights };
}

export function OnboardingOrchestrationShell() {
  const [draft, setDraft] = useState<OnboardingDraft>(() => createDefaultOnboardingDraft());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = loadOnboardingDraft();
    if (saved) setDraft(saved);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timeout = setTimeout(() => {
      const next: OnboardingDraft = {
        ...draft,
        lifecycleState: deriveLifecycleState(draft),
        updatedAt: new Date().toISOString(),
      };
      saveOnboardingDraft(next);
    }, 350);
    return () => clearTimeout(timeout);
  }, [draft, hydrated]);

  useEffect(() => {
    const hasPendingUpload = draft.uploadQueue.some((item) => item.status === "queued" || item.status === "uploading");
    if (!hasPendingUpload) return;

    const interval = setInterval(() => {
      setDraft((current) => {
        let changed = false;
        const nextQueue: UploadQueueItem[] = current.uploadQueue.map((item) => {
          if (item.status === "queued") {
            changed = true;
            return { ...item, status: "uploading" as const, progress: Math.max(item.progress, 8) };
          }
          if (item.status !== "uploading") return item;
          const nextProgress = Math.min(100, item.progress + 8 + Math.round(Math.random() * 14));
          changed = true;
          return {
            ...item,
            progress: nextProgress,
            status: nextProgress >= 100 ? ("uploaded" as const) : ("uploading" as const),
          };
        });

        if (!changed) return current;
        return { ...current, uploadQueue: nextQueue };
      });
    }, 280);

    return () => clearInterval(interval);
  }, [draft.uploadQueue]);

  useEffect(() => {
    if (draft.processingStageIndex <= 0 || draft.processingStageIndex > PORTFOLIO_RUNTIME_STATES.length) return;

    const timer = setTimeout(() => {
      setDraft((current) => {
        if (current.processingStageIndex >= PORTFOLIO_RUNTIME_STATES.length) {
          return {
            ...current,
            currentStep: "activation",
            processingStageIndex: PORTFOLIO_RUNTIME_STATES.length + 1,
            uploadQueue: current.uploadQueue.map((item) => ({
              ...item,
              status: item.status === "uploaded" || item.status === "processing" ? "processed" : item.status,
            })),
          };
        }
        return {
          ...current,
          processingStageIndex: current.processingStageIndex + 1,
          uploadQueue: current.uploadQueue.map((item) => ({
            ...item,
            status: item.status === "uploaded" ? "processing" : item.status,
          })),
        };
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [draft.processingStageIndex]);

  const stepIndex = ONBOARDING_STEPS.findIndex((item) => item.id === draft.currentStep);
  const activationSnapshot = useMemo(() => buildActivationSnapshot(draft), [draft]);
  const lifecycleState = deriveLifecycleState(draft);
  const lifecyclePercent = lifecycleProgress(lifecycleState);
  const profileComplete = isProfileComplete(draft);

  const updateDraft = (next: Partial<OnboardingDraft>) => {
    setDraft((current) => ({ ...current, ...next }));
  };

  const handleAddFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const items = Array.from(files).map<UploadQueueItem>((file) => ({
      id: `${Date.now()}-${file.name}-${Math.random().toString(16).slice(2)}`,
      name: file.name,
      mimeType: file.type,
      size: file.size,
      progress: 0,
      status: "queued",
    }));
    updateDraft({
      currentStep: "import",
      uploadQueue: [...draft.uploadQueue, ...items],
    });
  };

  const restartFlow = () => {
    clearOnboardingDraft();
    setDraft(createDefaultOnboardingDraft());
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-sky-300/70">Wealth operating system activation</p>
            <h1 className="mt-1 text-xl font-semibold text-white">Institutional Onboarding Journey</h1>
            <p className="mt-1 text-xs text-slate-400">Lifecycle state: {lifecycleState.replaceAll("_", " ")}</p>
          </div>
          <p className="text-xs text-slate-500">Step {Math.max(stepIndex + 1, 1)} of {ONBOARDING_STEPS.length}</p>
        </div>

        <div className="mt-4 h-1.5 rounded-full bg-white/10">
          <div className="h-1.5 rounded-full bg-sky-400 transition-all duration-500" style={{ width: `${lifecyclePercent}%` }} />
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {ONBOARDING_STEPS.map((step) => {
            const active = step.id === draft.currentStep;
            const complete = ONBOARDING_STEPS.findIndex((item) => item.id === step.id) < stepIndex;
            return (
              <div
                key={step.id}
                className={`rounded-lg border px-3 py-2 ${
                  active
                    ? "border-sky-300/35 bg-sky-500/12"
                    : complete
                      ? "border-emerald-400/20 bg-emerald-500/[0.08]"
                      : "border-white/10 bg-black/20"
                }`}
              >
                <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{step.label}</p>
                <p className="mt-1 text-xs text-slate-300">{step.subtitle}</p>
              </div>
            );
          })}
        </div>
      </section>

      <div key={draft.currentStep} className="animate-slide-up">
        {draft.currentStep === "welcome" ? (
          <WelcomeStep
            onStartSetup={() => updateDraft({ currentStep: "profile" })}
            onScheduleAssist={() => updateDraft({ advisorAssistScheduled: true, currentStep: "profile" })}
          />
        ) : null}

        {draft.currentStep === "profile" ? (
          <ProfileWizardStep
            identity={draft.identity}
            financial={draft.financial}
            onIdentityChange={(identity) => updateDraft({ identity })}
            onFinancialChange={(financial) => updateDraft({ financial })}
            onBack={() => updateDraft({ currentStep: "welcome" })}
            onContinue={() => {
              if (!profileComplete) return;
              updateDraft({ currentStep: "assets" });
            }}
          />
        ) : null}

        {draft.currentStep === "assets" ? (
          <AssetClassSelectionStep
            selectedAssetClasses={draft.selectedAssetClasses}
            onToggleAssetClass={(id) => {
              const selected = draft.selectedAssetClasses.includes(id)
                ? draft.selectedAssetClasses.filter((item) => item !== id)
                : [...draft.selectedAssetClasses, id];
              updateDraft({ selectedAssetClasses: selected });
            }}
            onBack={() => updateDraft({ currentStep: "profile" })}
            onContinue={() => updateDraft({ currentStep: "import" })}
          />
        ) : null}

        {draft.currentStep === "import" ? (
          <PortfolioImportStep
            queue={draft.uploadQueue}
            processingStageIndex={draft.processingStageIndex}
            manualEntryEnabled={draft.manualEntryEnabled}
            advisorAssistScheduled={draft.advisorAssistScheduled}
            onBack={() => updateDraft({ currentStep: "assets" })}
            onFilesSelected={handleAddFiles}
            onDropFiles={handleAddFiles}
            onToggleManualEntry={() => updateDraft({ manualEntryEnabled: !draft.manualEntryEnabled })}
            onScheduleAdvisorAssist={() => updateDraft({ advisorAssistScheduled: true })}
            onStartActivation={() => {
              if (draft.uploadQueue.length === 0) return;
              updateDraft({ processingStageIndex: 1 });
            }}
          />
        ) : null}

        {draft.currentStep === "activation" ? (
          <ActivationRevealStep
            metrics={activationSnapshot.metrics}
            insights={activationSnapshot.insights}
            onRestart={restartFlow}
          />
        ) : null}
      </div>
    </div>
  );
}
