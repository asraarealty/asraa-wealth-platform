"use client";

import { useRef, useState } from "react";
import SectionCard from "./SectionCard";
import Toggle from "./Toggle";

interface Property {
  id: string;
  name: string;
  location: string;
  price: number;
  roi: number;
  thumbnail: string;
  active: boolean;
}

const MOCK_PROPERTIES: Property[] = [
  {
    id: "p1",
    name: "Prestige Sunrise Park",
    location: "Whitefield, Bangalore",
    price: 8500000,
    roi: 12.4,
    thumbnail: "🏢",
    active: true,
  },
  {
    id: "p2",
    name: "DLF The Crest",
    location: "Sector 54, Gurgaon",
    price: 22000000,
    roi: 9.8,
    thumbnail: "🏬",
    active: true,
  },
  {
    id: "p3",
    name: "Brigade Orchards",
    location: "Devanahalli, Bangalore",
    price: 6200000,
    roi: 14.1,
    thumbnail: "🏡",
    active: true,
  },
  {
    id: "p4",
    name: "Lodha Altamount",
    location: "Altamount Road, Mumbai",
    price: 45000000,
    roi: 8.2,
    thumbnail: "🏙",
    active: false,
  },
  {
    id: "p5",
    name: "Godrej Reserve",
    location: "Kandivali, Mumbai",
    price: 11500000,
    roi: 11.3,
    thumbnail: "🏘",
    active: true,
  },
  {
    id: "p6",
    name: "Tata Housing Primanti",
    location: "Sector 72, Gurgaon",
    price: 9800000,
    roi: 10.7,
    thumbnail: "🏛",
    active: false,
  },
  {
    id: "p7",
    name: "Sobha Dream Acres",
    location: "Panathur, Bangalore",
    price: 4900000,
    roi: 13.5,
    thumbnail: "🌆",
    active: true,
  },
  {
    id: "p8",
    name: "Embassy Springs",
    location: "Devanahalli, Bangalore",
    price: 7300000,
    roi: 11.9,
    thumbnail: "🏠",
    active: false,
  },
];

const MAX_FEATURED = 6;

const CRORE = 10_000_000;
const LAKH = 100_000;

function fmtPrice(n: number) {
  if (n >= CRORE) return `₹${(n / CRORE).toFixed(1)}Cr`;
  if (n >= LAKH) return `₹${(n / LAKH).toFixed(1)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function FeaturedProperties() {
  const [search, setSearch] = useState("");
  const [properties, setProperties] = useState<Property[]>(MOCK_PROPERTIES);
  const [featured, setFeatured] = useState<Property[]>(
    MOCK_PROPERTIES.filter((p) => p.active).slice(0, 3)
  );
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);

  const filtered = properties.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.location.toLowerCase().includes(search.toLowerCase())
  );

  const featuredIds = new Set(featured.map((p) => p.id));

  function toggleSelect(property: Property) {
    if (featuredIds.has(property.id)) {
      setFeatured((prev) => prev.filter((p) => p.id !== property.id));
    } else if (featured.length < MAX_FEATURED) {
      setFeatured((prev) => [...prev, property]);
    }
  }

  function toggleActive(id: string) {
    setProperties((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p))
    );
    setFeatured((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p))
    );
  }

  // Drag-and-drop handlers for featured list reordering
  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    dragOverIndex.current = index;
  }

  function handleDrop() {
    if (dragIndex === null || dragOverIndex.current === null) return;
    if (dragIndex === dragOverIndex.current) {
      setDragIndex(null);
      return;
    }
    setFeatured((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(dragOverIndex.current!, 0, moved);
      return next;
    });
    setDragIndex(null);
    dragOverIndex.current = null;
  }

  async function handleSave() {
    // Save would send featured.map(p => p.id) with their order to the backend
    await new Promise<void>((resolve) => setTimeout(resolve, 600));
  }

  return (
    <SectionCard
      title="Featured Properties — Slider Control"
      icon={
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      }
      onSave={handleSave}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: property search & selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>
              All Properties
            </p>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                background: "rgba(0,229,255,0.08)",
                color: "#00E5FF",
                border: "1px solid rgba(0,229,255,0.15)",
              }}
            >
              {featured.length} / {MAX_FEATURED} selected
            </span>
          </div>

          {/* Search */}
          <div className="relative">
            <svg
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "rgba(255,255,255,0.3)" }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607z" />
            </svg>
            <input
              type="text"
              className="w-full neon-input rounded-xl pl-9 pr-4 py-2.5 text-sm"
              placeholder="Search by name or location…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Property list */}
          <div
            className="space-y-2 max-h-80 overflow-y-auto pr-1"
            style={{ scrollbarWidth: "thin" }}
          >
            {filtered.map((prop) => {
              const isSelected = featuredIds.has(prop.id);
              const isDisabled = !isSelected && featured.length >= MAX_FEATURED;
              return (
                <div
                  key={prop.id}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150"
                  style={{
                    background: isSelected
                      ? "rgba(0,229,255,0.06)"
                      : "rgba(255,255,255,0.02)",
                    border: isSelected
                      ? "1px solid rgba(0,229,255,0.2)"
                      : "1px solid rgba(255,255,255,0.05)",
                    opacity: isDisabled ? 0.45 : 1,
                    cursor: isDisabled ? "not-allowed" : "pointer",
                  }}
                  onClick={() => !isDisabled && toggleSelect(prop)}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-xl shrink-0"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                  >
                    {prop.thumbnail}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{prop.name}</p>
                    <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.45)" }}>
                      {prop.location}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold" style={{ color: "#C9A227" }}>
                      {fmtPrice(prop.price)}
                    </p>
                    <p className="text-xs" style={{ color: "#00ff9f" }}>
                      +{prop.roi}% ROI
                    </p>
                  </div>
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all"
                    style={{
                      background: isSelected ? "#00E5FF" : "rgba(255,255,255,0.06)",
                      border: isSelected ? "none" : "1px solid rgba(255,255,255,0.12)",
                    }}
                  >
                    {isSelected && (
                      <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: featured order + active toggle */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>
              Featured Order
            </p>
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
              Drag to reorder
            </span>
          </div>

          {featured.length === 0 ? (
            <div
              className="rounded-xl p-8 text-center"
              style={{ border: "1px dashed rgba(255,255,255,0.1)" }}
            >
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
                No properties selected
              </p>
              <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.2)" }}>
                Select up to {MAX_FEATURED} from the list
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {featured.map((prop, i) => (
                <div
                  key={prop.id}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDrop={handleDrop}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150 select-none"
                  style={{
                    background:
                      dragIndex === i
                        ? "rgba(0,229,255,0.08)"
                        : "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    cursor: "grab",
                    opacity: dragIndex === i ? 0.6 : 1,
                  }}
                >
                  {/* Drag handle */}
                  <svg
                    className="w-4 h-4 shrink-0"
                    style={{ color: "rgba(255,255,255,0.2)" }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
                  </svg>

                  {/* Order badge */}
                  <span
                    className="w-5 h-5 rounded-md text-xs font-bold flex items-center justify-center shrink-0"
                    style={{ background: "rgba(0,229,255,0.12)", color: "#00E5FF" }}
                  >
                    {i + 1}
                  </span>

                  {/* Thumbnail */}
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center text-base shrink-0"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                  >
                    {prop.thumbnail}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{prop.name}</p>
                    <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {fmtPrice(prop.price)} · +{prop.roi}% ROI
                    </p>
                  </div>

                  {/* Active toggle */}
                  <Toggle
                    checked={prop.active}
                    onChange={() => toggleActive(prop.id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SectionCard>
  );
}
