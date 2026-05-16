import type { ReactNode } from "react";

export function IntelligenceWidget({
  eyebrow,
  title,
  detail,
  children,
  className = "",
}: {
  eyebrow: string;
  title: string;
  detail?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[1.25rem] border border-white/8 bg-white/[0.035] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-sky-300/65">{eyebrow}</p>
          <h3 className="mt-1 text-sm font-semibold text-white">{title}</h3>
        </div>
        {detail ? <p className="max-w-[13rem] text-right text-xs leading-5 text-slate-400">{detail}</p> : null}
      </div>
      {children}
    </section>
  );
}
