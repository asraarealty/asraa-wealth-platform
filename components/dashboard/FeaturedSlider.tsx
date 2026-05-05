"use client";

import { useEffect, useRef, useState } from "react";
import { getPublicFeaturedProperties, type PublicFeaturedProperty } from "@/lib/api";

const CRORE = 10_000_000;
const LAKH = 100_000;

const CARD_WIDTH = 280;
const CARD_GAP = 12;
const CARD_STRIDE = CARD_WIDTH + CARD_GAP;
const SCROLL_THRESHOLD = 4;

function fmtPrice(n: number) {
  if (n >= CRORE) return `₹${(n / CRORE).toFixed(1)}Cr`;
  if (n >= LAKH) return `₹${(n / LAKH).toFixed(1)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

// Resolve a potentially relative or data URL to the correct browser path.
function resolveImageUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("//") || url.startsWith("data:")) return url;
  return `/api/v2${url.startsWith("/") ? url : `/${url}`}`;
}

// ── Loading skeleton card ────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      className="shrink-0 rounded-2xl animate-pulse"
      style={{
        width: `${CARD_WIDTH}px`,
        height: "200px",
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    />
  );
}

// ── Property banner card ─────────────────────────────────────────────────────

function PropertyCard({ property }: { property: PublicFeaturedProperty }) {
  const imageUrl = resolveImageUrl(property.imageUrl);
  const hasLink = Boolean(property.redirectUrl);

  function handleClick() {
    if (hasLink) {
      window.open(property.redirectUrl, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div
      onClick={handleClick}
      className="shrink-0 rounded-2xl overflow-hidden relative group transition-transform duration-200 hover:scale-[1.02]"
      style={{
        width: `${CARD_WIDTH}px`,
        height: "200px",
        cursor: hasLink ? "pointer" : "default",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.04)",
        flexShrink: 0,
      }}
    >
      {/* Background image */}
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={property.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          draggable={false}
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, rgba(0,229,255,0.06), rgba(79,140,255,0.06))" }}
        >
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} style={{ color: "rgba(0,229,255,0.25)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5" />
          </svg>
        </div>
      )}

      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(5,11,24,0.92) 0%, rgba(5,11,24,0.3) 55%, transparent 100%)" }}
      />

      {/* ROI badge */}
      {property.roi != null && (
        <div
          className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
          style={{ background: "rgba(0,229,255,0.15)", border: "1px solid rgba(0,229,255,0.3)", color: "#00E5FF", backdropFilter: "blur(8px)" }}
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
          </svg>
          {property.roi}% ROI
        </div>
      )}

      {/* External link indicator */}
      {hasLink && (
        <div
          className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full p-1"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: "rgba(255,255,255,0.8)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </div>
      )}

      {/* Bottom info area */}
      <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-6">
        {/* Location */}
        {property.location && (
          <p className="text-xs mb-0.5 flex items-center gap-1" style={{ color: "rgba(255,255,255,0.55)" }}>
            <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <span className="truncate">{property.location}</span>
          </p>
        )}

        {/* Title */}
        <p className="text-sm font-bold text-white truncate leading-tight">{property.title}</p>

        {/* Price + CTA row */}
        <div className="flex items-center justify-between mt-2 gap-2">
          {property.price != null ? (
            <p className="text-xs font-semibold" style={{ color: "rgba(0,229,255,0.9)" }}>
              {fmtPrice(property.price)}
            </p>
          ) : (
            <span />
          )}

          {hasLink && (
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0 transition-all duration-200 group-hover:gap-1.5"
              style={{
                background: "linear-gradient(135deg, rgba(0,229,255,0.9), rgba(79,140,255,0.9))",
                color: "#050b18",
              }}
            >
              View Property
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Navigation arrows ────────────────────────────────────────────────────────

function NavArrow({ direction, onClick, hidden }: { direction: "left" | "right"; onClick: () => void; hidden: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "left" ? "Scroll left" : "Scroll right"}
      className="shrink-0 flex items-center justify-center rounded-full transition-all duration-150 hover:scale-110 active:scale-95 disabled:opacity-0"
      style={{
        width: "32px",
        height: "32px",
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.1)",
        color: "rgba(255,255,255,0.7)",
        opacity: hidden ? 0 : 1,
        pointerEvents: hidden ? "none" : "auto",
        transition: "opacity 0.2s, transform 0.15s",
      }}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        {direction === "left" ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        )}
      </svg>
    </button>
  );
}

// ── Main FeaturedSlider component ────────────────────────────────────────────

export default function FeaturedSlider() {
  const [properties, setProperties] = useState<PublicFeaturedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    getPublicFeaturedProperties(ac.signal)
      .then((data) => setProperties(Array.isArray(data) ? data : []))
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setProperties([]);
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  function updateScrollState() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > SCROLL_THRESHOLD);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - SCROLL_THRESHOLD);
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [loading, properties.length]);

  function scrollBy(delta: number) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: "smooth" });
  }

  // Don't render section if no data and not loading
  if (!loading && properties.length === 0) return null;

  return (
    <div className="glass-card rounded-2xl p-5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: "rgba(0,229,255,0.6)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
          </svg>
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "rgba(0,229,255,0.6)" }}
          >
            Featured Properties
          </p>
        </div>
        {/* Arrow controls */}
        {!loading && properties.length > 1 && (
          <div className="flex items-center gap-1.5">
            <NavArrow direction="left" onClick={() => scrollBy(-CARD_STRIDE)} hidden={!canScrollLeft} />
            <NavArrow direction="right" onClick={() => scrollBy(CARD_STRIDE)} hidden={!canScrollRight} />
          </div>
        )}
      </div>

      {/* Scroll track */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto pb-1"
        style={{ gap: `${CARD_GAP}px`, scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          : properties.map((prop) => (
              <PropertyCard key={prop.id} property={prop} />
            ))}
      </div>

      {/* Dot indicator */}
      {!loading && properties.length > 1 && (
        <div className="flex items-center justify-center gap-1 pt-0.5">
          {properties.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to property ${i + 1}`}
              onClick={() => {
                const el = scrollRef.current;
                if (!el) return;
                el.scrollTo({ left: i * CARD_STRIDE, behavior: "smooth" });
              }}
              className="rounded-full transition-all duration-200"
              style={{
                width: "6px",
                height: "6px",
                background: "rgba(0,229,255,0.3)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
