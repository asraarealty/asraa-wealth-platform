import { ReactNode } from "react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export default function EmptyState({
  title = "No data yet",
  description = "Nothing to display at the moment.",
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="glass-card rounded-2xl flex flex-col items-center justify-center gap-4 py-14 px-8 text-center">
      {icon ? (
        <span className="text-4xl opacity-60">{icon}</span>
      ) : (
        <svg
          className="w-12 h-12 opacity-30"
          fill="none"
          viewBox="0 0 48 48"
          stroke="#38bdf8"
          strokeWidth={1.5}
        >
          <circle cx="24" cy="24" r="20" />
          <path strokeLinecap="round" d="M24 16v8m0 8h.01" />
        </svg>
      )}
      <div>
        <p className="text-base font-semibold text-white mb-1">{title}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
