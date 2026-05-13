"use client";

import type { RealEstateCategory } from "@/lib/types/realEstate";
import { REAL_ESTATE_CATEGORY_OPTIONS } from "@/lib/utils/realEstateCategory";

export default function RealEstateCategorySwitcher({
  value,
  onChange,
  className = "",
}: {
  value: RealEstateCategory;
  onChange: (value: RealEstateCategory) => void;
  className?: string;
}) {
  return (
    <label className={`inline-flex items-center gap-2 text-xs sm:text-sm text-white/70 ${className}`}>
      <span className="uppercase tracking-wider text-white/45">Category</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as RealEstateCategory)}
        className="gold-input rounded-xl px-3 py-2 text-sm min-w-[160px]"
      >
        {REAL_ESTATE_CATEGORY_OPTIONS.map((item) => (
          <option key={item.value} value={item.value} className="bg-slate-900 text-white">
            {item.label}
          </option>
        ))}
      </select>
    </label>
  );
}
