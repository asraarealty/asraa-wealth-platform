"use client";

import { useEffect, useRef, useState } from "react";
import { getPublicFeaturedProperties, type PublicFeaturedProperty } from "@/lib/api";

// Resolve a potentially relative image URL to an absolute-for-browser path.
function resolveImageUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("//")) return url;
  return `/api/v2${url.startsWith("/") ? url : `/${url}`}`;
}

// ── Loading skeleton card ────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      className="shrink-0 rounded-2xl animate-pulse"
      style={{
        width: "260px",
        height: "140px",
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    />
  );
}

// ── Property banner card ─────────────────────────────────────────────────────

function PropertyCard({ property }: { property: PublicFeaturedProperty }) {
  const imageUrl = resolveImageUrl(property.imageUrl);

  function handleClick() {
    if (property.redirectUrl) {
      window.open(property.redirectUrl, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div
      onClick={handleClick}
      className="shrink-0 rounded-2xl overflow-hidden relative group transition-transform duration-200 hover:scale-[1.03]"
      style={{
        width: "260px",
        height: "140px",
        cursor: property.redirectUrl ? "pointer" : "default",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.04)",
      }}
      title={property.redirectUrl ? `Open: ${property.title}` : property.title}
    >
      {/* Image */}
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={property.title}
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: "rgba(0,229,255,0.06)" }}
        >
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1} style={{ color: "rgba(0,229,255,0.3)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5" />
          </svg>
        </div>
      )}

      {/* Overlay gradient */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to top, rgba(5,11,24,0.75) 0%, transparent 60%)" }}
      />

      {/* Title */}
      <div className="absolute bottom-0 left-0 right-0 px-3 py-2">
        <p className="text-xs font-semibold text-white truncate">{property.title}</p>
      </div>

      {/* External link icon on hover */}
      {property.redirectUrl && (
        <div
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full p-1"
          style={{ background: "rgba(0,0,0,0.55)" }}
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: "rgba(255,255,255,0.8)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </div>
      )}
    </div>
  );
}

// ── Main FeaturedSlider component ────────────────────────────────────────────

export default function FeaturedSlider() {
  const [properties, setProperties] = useState<PublicFeaturedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ac = new AbortController();
    getPublicFeaturedProperties(ac.signal)
      .then((data) => setProperties(Array.isArray(data) ? data : []))
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Non-critical — silently hide section on error
        setProperties([]);
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  // Auto-scroll: slowly drift right, reverse at end
  useEffect(() => {
    if (loading || properties.length === 0) return;
    const el = scrollRef.current;
    if (!el) return;

    let paused = false;
    let direction = 1;
    let intervalId: ReturnType<typeof setInterval>;

    function startScroll() {
      intervalId = setInterval(() => {
        if (paused || !el) return;
        const maxScroll = el.scrollWidth - el.clientWidth;
        if (maxScroll <= 0) return;
        el.scrollLeft += direction;
        if (el.scrollLeft >= maxScroll) direction = -1;
        else if (el.scrollLeft <= 0) direction = 1;
      }, 30);
    }

    const pause = () => { paused = true; };
    const resume = () => { paused = false; };

    el.addEventListener("mouseenter", pause);
    el.addEventListener("mouseleave", resume);
    startScroll();

    return () => {
      clearInterval(intervalId);
      el?.removeEventListener("mouseenter", pause);
      el?.removeEventListener("mouseleave", resume);
    };
  }, [loading, properties.length]);

  // Don't render section if no data and not loading
  if (!loading && properties.length === 0) return null;

  return (
    <div className="glass-card rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <p
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: "rgba(0,229,255,0.6)" }}
        >
          Featured Properties
        </p>
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: "rgba(0,229,255,0.4)" }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
        </svg>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : properties.map((prop) => (
              <PropertyCard key={prop.id} property={prop} />
            ))}
      </div>
    </div>
  );
}
