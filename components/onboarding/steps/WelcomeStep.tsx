"use client";

export function WelcomeStep({
  onStartSetup,
  onScheduleAssist,
}: {
  onStartSetup: () => void;
  onScheduleAssist: () => void;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[linear-gradient(160deg,rgba(12,18,34,0.9),rgba(9,13,24,0.92))] p-6 sm:p-8">
      <p className="text-[10px] uppercase tracking-[0.18em] text-sky-300/70">Asraa Wealth OS</p>
      <h1 className="mt-2 text-3xl font-semibold leading-tight text-white sm:text-4xl">Welcome to Asraa Wealth OS</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
        Track, organize, and grow your complete wealth from one intelligent operating system.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onStartSetup}
          className="rounded-xl bg-sky-400 px-5 py-3 text-sm font-semibold text-[#04102a] transition hover:bg-sky-300"
        >
          Start Wealth Setup
        </button>
        <button
          type="button"
          onClick={onScheduleAssist}
          className="rounded-xl border border-white/15 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/[0.08]"
        >
          Schedule Assisted Onboarding
        </button>
      </div>
    </section>
  );
}
