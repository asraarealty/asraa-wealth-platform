"use client";

import { useMemo } from "react";

interface DataPoint {
  month: string;
  value: number;
}

/**
 * Static growth shape used purely for visual illustration of an upward trend.
 * These values are relative multipliers (base = 100) that get scaled to the
 * real current portfolio total at render time.  They do NOT represent actual
 * historical returns — the API does not expose time-series data.
 * Month labels span the 12 months leading up to the current display period.
 */
const GROWTH_SHAPE: DataPoint[] = [
  { month: "May", value: 100 },
  { month: "Jun", value: 104.2 },
  { month: "Jul", value: 101.8 },
  { month: "Aug", value: 107.5 },
  { month: "Sep", value: 111.3 },
  { month: "Oct", value: 108.9 },
  { month: "Nov", value: 115.4 },
  { month: "Dec", value: 119.7 },
  { month: "Jan", value: 117.2 },
  { month: "Feb", value: 123.6 },
  { month: "Mar", value: 128.1 },
  { month: "Apr", value: 134.8 },
];

interface Props {
  /** Real current portfolio total value from the API. */
  totalValue: number;
  /** Real total gain % from the API (e.g. 12.4 for +12.4%). */
  gainPercent: number;
}

export default function PortfolioGrowthChart({ totalValue, gainPercent }: Props) {
  const data = useMemo<DataPoint[]>(() => {
    const latest = GROWTH_SHAPE[GROWTH_SHAPE.length - 1].value;
    return GROWTH_SHAPE.map((d) => ({
      ...d,
      value: (d.value / latest) * totalValue,
    }));
  }, [totalValue]);

  const width = 600;
  const height = 180;
  const padX = 40;
  const padY = 20;

  const minVal = Math.min(...data.map((d) => d.value));
  const maxVal = Math.max(...data.map((d) => d.value));
  const range = maxVal - minVal || 1;

  const toX = (i: number) =>
    padX + (i / (data.length - 1)) * (width - padX * 2);
  const toY = (v: number) =>
    padY + (1 - (v - minVal) / range) * (height - padY * 2);

  // Build smooth cubic bezier path
  const smoothPath = data.reduce((path, d, i) => {
    if (i === 0) return `M ${toX(i)} ${toY(d.value)}`;
    const prev = data[i - 1];
    const cpX = (toX(i - 1) + toX(i)) / 2;
    return `${path} C ${cpX} ${toY(prev.value)}, ${cpX} ${toY(d.value)}, ${toX(i)} ${toY(d.value)}`;
  }, "");

  const areaPath = `${smoothPath} L ${toX(data.length - 1)} ${height - padY} L ${toX(0)} ${height - padY} Z`;

  const latestValue = data[data.length - 1].value;
  const peakIdx = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);
  const displayGain = gainPercent;

  return (
    <div className="glass-card card-hover rounded-2xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs uppercase tracking-widest font-semibold mb-1" style={{ color: "rgba(201,162,39,0.65)" }}>
            Portfolio Growth
          </p>
          <p className="text-xl font-bold text-white tracking-tight">
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 0,
            }).format(latestValue)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-semibold px-3 py-1 rounded-full border ${
              displayGain >= 0
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-red-500/10 text-red-400 border-red-500/20"
            }`}
          >
            {displayGain >= 0 ? "+" : ""}{displayGain.toFixed(1)}%
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height: 140 }}
        aria-label="Portfolio growth line chart"
      >
        <defs>
          <linearGradient id="areaGradientGreen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
            <stop offset="75%" stopColor="#10b981" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
          <filter id="lineGlow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="dotGlow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={t}
            x1={padX}
            y1={padY + t * (height - padY * 2)}
            x2={width - padX}
            y2={padY + t * (height - padY * 2)}
            stroke="rgba(16,185,129,0.07)"
            strokeWidth={1}
            strokeDasharray={t === 0 || t === 1 ? "none" : "4 6"}
          />
        ))}

        {/* Area fill */}
        <path d={areaPath} fill="url(#areaGradientGreen)" />

        {/* Main green line with draw animation */}
        <path
          d={smoothPath}
          fill="none"
          stroke="#10b981"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
          filter="url(#lineGlow)"
          strokeDasharray="1200"
          className="animate-draw-line"
        />

        {/* Month labels */}
        {data.map((d, i) =>
          i % 2 === 0 ? (
            <text
              key={d.month}
              x={toX(i)}
              y={height - 2}
              textAnchor="middle"
              fontSize={10}
              fill="rgba(255,255,255,0.2)"
            >
              {d.month}
            </text>
          ) : null
        )}

        {/* Peak highlight point (gold) */}
        <circle
          cx={toX(peakIdx)}
          cy={toY(data[peakIdx].value)}
          r={5}
          fill="#c9a227"
          filter="url(#dotGlow)"
        />
        <circle
          cx={toX(peakIdx)}
          cy={toY(data[peakIdx].value)}
          r={9}
          fill="none"
          stroke="#c9a227"
          strokeOpacity={0.25}
          strokeWidth={1.5}
        />

        {/* Latest data point dot (emerald) */}
        <circle
          cx={toX(data.length - 1)}
          cy={toY(latestValue)}
          r={5}
          fill="#10b981"
          filter="url(#lineGlow)"
        />
        <circle
          cx={toX(data.length - 1)}
          cy={toY(latestValue)}
          r={9}
          fill="none"
          stroke="#10b981"
          strokeOpacity={0.3}
          strokeWidth={1.5}
        />
      </svg>
    </div>
  );
}
