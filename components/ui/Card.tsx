import { ReactNode } from "react";

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export default function Card({ title, children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-lg border border-slate-800 bg-slate-900 p-6 ${className}`}
    >
      {title && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}
