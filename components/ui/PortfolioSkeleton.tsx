"use client";

export default function PortfolioSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 rounded-lg bg-white/10" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 rounded-2xl bg-white/5 border border-white/10" />
        ))}
      </div>
      <div className="h-56 rounded-2xl bg-white/5 border border-white/10" />
      <div className="h-72 rounded-2xl bg-white/5 border border-white/10" />
    </div>
  );
}
