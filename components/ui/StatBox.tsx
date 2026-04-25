import { ReactNode } from "react";

interface StatBoxProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
}

export default function StatBox({
  label,
  value,
  subValue,
  icon,
  trend,
  trendLabel,
}: StatBoxProps) {
  const trendColor =
    trend === "up"
      ? "text-emerald-400"
      : trend === "down"
      ? "text-red-400"
      : "text-gray-400";

  const trendArrow =
    trend === "up" ? "▲" : trend === "down" ? "▼" : "";

  return (
    <div className="glass-card rounded-2xl p-6 flex flex-col gap-3 animate-slide-up">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-gold-light">
          {label}
        </p>
        {icon && (
          <span className="text-gold opacity-70">{icon}</span>
        )}
      </div>

      <p className="text-3xl font-bold text-white leading-none">{value}</p>

      {(subValue || trendLabel) && (
        <div className="flex items-center gap-2 text-xs">
          {trendLabel && (
            <span className={`font-semibold ${trendColor}`}>
              {trendArrow} {trendLabel}
            </span>
          )}
          {subValue && (
            <span className="text-gray-500">{subValue}</span>
          )}
        </div>
      )}
    </div>
  );
}
