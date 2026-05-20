"use client";

import { memo, useCallback, useMemo, useRef } from "react";
import type { FeaturedProperty } from "@/domains/portfolio";
import { SectionHeader, SurfaceCard } from "@/components/v2/ui";

const SCROLL_WIDTH_FACTOR = 0.88;
const MIN_SCROLL_WIDTH_PX = 280;

function isExternalHref(href: string) {
  return /^https?:\/\//i.test(href);
}

function initials(title: string) {
  return title
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export const FeaturedOpportunitiesSlider = memo(function FeaturedOpportunitiesSlider({
  properties,
}: {
  properties: FeaturedProperty[];
}) {
  const railRef = useRef<HTMLDivElement | null>(null);

  const items = useMemo(() => properties.slice(0, 8), [properties]);

  const scrollRail = useCallback((direction: "prev" | "next") => {
    const rail = railRef.current;
    if (!rail) return;
    const amount = Math.max(rail.clientWidth * SCROLL_WIDTH_FACTOR, MIN_SCROLL_WIDTH_PX);
    rail.scrollBy({
      left: direction === "next" ? amount : -amount,
      behavior: "smooth",
    });
  }, []);

  if (items.length === 0) {
    return (
      <SurfaceCard className="p-5 sm:p-6">
        <SectionHeader
          eyebrow="Private Real Estate"
          title="Featured Opportunities"
          subtitle="Featured property showcases will appear here once they are configured in the advisory workspace."
        />
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard className="overflow-hidden p-5 sm:p-6">
      <SectionHeader
        eyebrow="Private Real Estate"
        title="Featured Opportunities"
        subtitle="A curated showcase of premium property access across your real estate book."
        action={
          <div className="hidden items-center gap-2 md:flex">
            <button
              type="button"
              onClick={() => scrollRail("prev")}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/10"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => scrollRail("next")}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/10"
            >
              →
            </button>
          </div>
        }
      />

      <div
        ref={railRef}
        className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((property) => {
          const href = property.href;
          const external = href ? isExternalHref(href) : false;
          return (
            <article
              key={property.id}
              className="group relative flex min-h-[25rem] w-[84vw] shrink-0 snap-start flex-col overflow-hidden rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(15,23,42,0.9))] shadow-[0_22px_70px_rgba(2,6,23,0.45)] sm:w-[22rem] lg:w-[calc((100%-3rem)/4)]"
            >
              <div className="relative h-60 overflow-hidden">
                {property.imageUrl ? (
                  <div
                    className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-[1.04]"
                    style={{ backgroundImage: `linear-gradient(180deg,rgba(2,6,23,0.04),rgba(2,6,23,0.45)),url(${property.imageUrl})` }}
                  />
                ) : (
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(186,230,253,0.35),transparent_38%),linear-gradient(145deg,rgba(30,41,59,0.92),rgba(15,23,42,0.98))]">
                    <div className="flex h-full items-center justify-center text-4xl font-semibold tracking-[0.18em] text-white/70">
                      {initials(property.title)}
                    </div>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#050816] via-[#050816]/80 to-transparent" />
                <div className="absolute left-5 top-5 rounded-full border border-amber-300/20 bg-amber-200/10 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-amber-100">
                  Featured
                </div>
              </div>

              <div className="relative flex flex-1 flex-col px-5 pb-5 pt-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{property.location}</p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight text-white">{property.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">{property.tagline}</p>

                <div className="mt-auto pt-5">
                  {href ? (
                    <a
                      href={href}
                      target={external ? "_blank" : undefined}
                      rel={external ? "noreferrer" : undefined}
                      className="inline-flex w-full items-center justify-center rounded-2xl border border-sky-300/20 bg-[linear-gradient(135deg,rgba(125,211,252,0.18),rgba(59,130,246,0.14))] px-4 py-3 text-sm font-semibold text-sky-50 transition hover:border-sky-200/35 hover:shadow-[0_0_28px_rgba(56,189,248,0.18)]"
                    >
                      View Property
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-400"
                    >
                      View Property
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </SurfaceCard>
  );
});
