"use client";

export interface ActivationMetric {
  label: string;
  value: string;
}

export function ActivationRevealStep({
  metrics,
  insights,
  onRestart,
}: {
  metrics: ActivationMetric[];
  insights: string[];
  onRestart: () => void;
}) {
  return (
    <section className="rounded-2xl border border-emerald-300/30 bg-[linear-gradient(150deg,rgba(9,28,24,0.82),rgba(7,15,22,0.92))] p-6 sm:p-7">
      <p className="text-[10px] uppercase tracking-[0.16em] text-emerald-300/80">Wealth activation complete</p>
      <h2 className="mt-1 text-2xl font-semibold text-white">Your Wealth OS is now activated</h2>
      <p className="mt-2 max-w-2xl text-sm text-slate-300">
        Your wealth has been organized into a single operating layer with portfolio visibility, allocation intelligence, and advisory insights.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-xl border border-white/12 bg-black/20 p-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{metric.label}</p>
            <p className="mt-1.5 text-lg font-semibold text-white">{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">AI Insights</p>
        <ul className="mt-2 space-y-1.5">
          {insights.map((insight) => (
            <li key={insight} className="text-sm text-slate-200">
              • {insight}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5">
        <button
          type="button"
          onClick={onRestart}
          className="rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-100 hover:bg-white/[0.08]"
        >
          Restart onboarding
        </button>
      </div>
    </section>
  );
}
