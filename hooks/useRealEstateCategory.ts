"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { RealEstateCategory } from "@/lib/types/realEstate";
import { normalizeRealEstateCategory } from "@/lib/utils/realEstateCategory";

const QUERY_KEY = "reCategory";

export function useRealEstateCategory(defaultValue: RealEstateCategory = "all") {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const category = useMemo(
    () => normalizeRealEstateCategory(searchParams.get(QUERY_KEY) ?? defaultValue),
    [defaultValue, searchParams]
  );

  const setCategory = useCallback(
    (next: RealEstateCategory) => {
      const params = new URLSearchParams(searchParams.toString());
      const normalized = normalizeRealEstateCategory(next);
      if (normalized === "all") {
        params.delete(QUERY_KEY);
      } else {
        params.set(QUERY_KEY, normalized);
      }
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  return { category, setCategory };
}
