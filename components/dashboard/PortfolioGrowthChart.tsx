"use client";

import { useMemo } from "react";

interface DataPoint {
  month: string;
  value: number;
}

// Mock 12-month portfolio growth data (% gain from base)
const MOCK_DATA: DataPoint[] = [
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
  baseValue?: number;
}

export default function PortfolioGrowthChart({ baseValue = 100000 }: Props) {
  const data = useMemo<DataPoint[]>(() => {
    return MOCK_DATA.map((d) => ({
      ...d,
      value: (d.value / 100) * baseValue,
    }));
  }, [baseValue]);

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

  const linePath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(d.value)}`)
    .join(" ");

  const areaPath = `${linePath} L ${toX(data.length - 1)} ${height - padY} L ${toX(0)} ${height - padY} Z`;

  const latestValue = data[data.length - 1].value;
  const gain = ((latestValue - data[0].value) / data[0].value) * 100;

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs text-gold-light uppercase tracking-wider font-medium mb-1">
            Portfolio Growth
          </p>
          <p className="text-xl font-bold text-white">
            {new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
              maximumFractionDigits: 0,
            }).format(latestValue)}
          </p>
        </div>
        <span className="text-sm font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          +{gain.toFixed(1)}%
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ height: 140 }}
        aria-label="Portfolio growth line chart"
      >
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c9a227" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#c9a227" stopOpacity="0.02" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
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
            stroke="rgba(201,162,39,0.08)"
            strokeWidth={1}
          />
        ))}

        {/* Area fill */}
        <path d={areaPath} fill="url(#areaGradient)" />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="#c9a227"
          strokeWidth={2}
          strokeLinejoin="round"
          filter="url(#glow)"
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
              fill="rgba(201,162,39,0.5)"
            >
              {d.month}
            </text>
          ) : null
        )}

        {/* Last data point dot */}
        <circle
          cx={toX(data.length - 1)}
          cy={toY(latestValue)}
          r={4}
          fill="#c9a227"
          filter="url(#glow)"
        />
      </svg>
    </div>
  );
}
