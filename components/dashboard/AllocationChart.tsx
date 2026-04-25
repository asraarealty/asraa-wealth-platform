"use client";

import { useMemo } from "react";
import type { Portfolio } from "@/lib/api";

interface Slice {
  label: string;
  value: number;
  color: string;
}

const SLICE_COLORS = [
  "#c9a227",
  "#2ecc71",
  "#3498db",
  "#9b59b6",
  "#e74c3c",
  "#f39c12",
];

interface Props {
  positions: Portfolio[];
}

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

// Fallback slices shown only when no positions are loaded yet
const FALLBACK_SLICES: Slice[] = [
  { label: "Equities", value: 45, color: SLICE_COLORS[0] },
  { label: "Bonds", value: 25, color: SLICE_COLORS[1] },
  { label: "Real Estate", value: 15, color: SLICE_COLORS[2] },
  { label: "Cash", value: 10, color: SLICE_COLORS[3] },
  { label: "Alts", value: 5, color: SLICE_COLORS[4] },
];

export default function AllocationChart({ positions }: Props) {
  const slices = useMemo<Slice[]>(() => {
    if (!positions || positions.length === 0) return FALLBACK_SLICES;

    // Compute total from ALL positions so that individual percentages are
    // correct relative to the whole portfolio, not just the top-5 slice.
    const allTotal = positions.reduce((sum, p) => sum + p.value, 0) || 1;

    const sorted = [...positions]
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return sorted.map((pos, i) => ({
      label: pos.symbol,
      value: pos.allocation !== undefined
        ? pos.allocation
        : (pos.value / allTotal) * 100,
      color: SLICE_COLORS[i % SLICE_COLORS.length],
    }));
  }, [positions]);

  const cx = 90;
  const cy = 90;
  const outerR = 72;
  const innerR = 48;

  let cumAngle = 0;
  const total = slices.reduce((s, sl) => s + sl.value, 0) || 1;

  const arcs = slices.map((sl) => {
    const startAngle = cumAngle;
    const sweep = (sl.value / total) * 360;
    cumAngle += sweep;
    return { ...sl, startAngle, sweep };
  });

  return (
    <div className="glass-card card-hover rounded-2xl p-5">
      <p className="text-xs uppercase tracking-widest font-semibold mb-4" style={{ color: "rgba(201,162,39,0.65)" }}>
        Allocation
      </p>

      <div className="flex items-center gap-6">
        {/* SVG Donut */}
        <svg
          viewBox="0 0 180 180"
          width={160}
          height={160}
          className="shrink-0"
          aria-label="Portfolio allocation donut chart"
        >
          <defs>
            <filter id="sliceGlow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {arcs.map((arc) => {
            const start = polarToCartesian(cx, cy, outerR, arc.startAngle);
            const outerEnd = polarToCartesian(
              cx,
              cy,
              outerR,
              arc.startAngle + arc.sweep
            );
            const innerEnd = polarToCartesian(
              cx,
              cy,
              innerR,
              arc.startAngle + arc.sweep
            );
            const innerStart = polarToCartesian(
              cx,
              cy,
              innerR,
              arc.startAngle
            );
            const largeArc = arc.sweep > 180 ? 1 : 0;

            const d = [
              `M ${start.x} ${start.y}`,
              `A ${outerR} ${outerR} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
              `L ${innerEnd.x} ${innerEnd.y}`,
              `A ${innerR} ${innerR} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
              "Z",
            ].join(" ");

            return (
              <path
                key={arc.label}
                d={d}
                fill={arc.color}
                opacity={0.85}
                stroke="rgba(7,26,20,0.9)"
                strokeWidth={2}
                filter="url(#sliceGlow)"
              />
            );
          })}

          {/* Center text */}
          <text
            x={cx}
            y={cy - 6}
            textAnchor="middle"
            fill="white"
            fontSize={13}
            fontWeight="bold"
          >
            AUM
          </text>
          <text
            x={cx}
            y={cy + 10}
            textAnchor="middle"
            fill="rgba(201,162,39,0.8)"
            fontSize={9}
          >
            Diversified
          </text>
        </svg>

        {/* Legend */}
        <ul className="space-y-2 flex-1 min-w-0">
          {arcs.map((arc) => (
            <li key={arc.label} className="flex items-center gap-2 text-xs">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ background: arc.color }}
              />
              <span className="text-gray-300 truncate">{arc.label}</span>
              <span className="ml-auto text-gold-light font-medium shrink-0">
                {arc.value.toFixed(1)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
