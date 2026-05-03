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
      ? "#00ff9f"
      : trend === "down"
      ? "#ff4d6d"
      : "rgba(255,255,255,0.4)";

  const trendBg =
    trend === "up"
      ? "rgba(0,255,159,0.08)"
      : trend === "down"
      ? "rgba(255,77,109,0.08)"
      : "rgba(255,255,255,0.04)";

  const trendArrow =
    trend === "up" ? "▲" : trend === "down" ? "▼" : "";

  return (
    <div
      className="glass-card card-hover rounded-2xl p-6 flex flex-col gap-3 animate-float-up"
      style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.4)" }}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(0,229,255,0.55)" }}>
          {label}
        </p>
        {icon && (
          <span
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(0,229,255,0.08)", color: "#00E5FF" }}
          >
            {icon}
          </span>
        )}
      </div>

      <p className="text-3xl font-bold text-white leading-none tracking-tight">{value}</p>

      {(subValue || trendLabel) && (
        <div className="flex items-center gap-2 text-xs">
          {trendLabel && (
            <span
              className="font-semibold px-2 py-0.5 rounded-full"
              style={{ color: trendColor, background: trendBg }}
            >
              {trendArrow} {trendLabel}
            </span>
          )}
          {subValue && (
            <span className="text-white/35">{subValue}</span>
          )}
        </div>
      )}
    </div>
  );
}

