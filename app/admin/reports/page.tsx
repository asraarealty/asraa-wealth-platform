"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * /admin/reports — redirects to the Insights page which contains
 * all portfolio intelligence and analytics.
 */
export default function ReportsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/insights");
  }, [router]);
  return null;
}
