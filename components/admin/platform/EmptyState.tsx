import type { ReactNode } from "react";

export function OperationalEmptyState({
  title,
  description,
  hint,
  action,
  icon = "◎",
}: {
  title: string;
  description: string;
  hint: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-sky-400/20 bg-sky-500/[0.06] p-6 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-400/15 bg-sky-500/10 text-xl text-sky-200">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
      <p className="mt-3 text-xs uppercase tracking-[0.16em] text-sky-200/70">{hint}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
