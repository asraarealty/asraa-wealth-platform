"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, msUntilExpiry } from "@/lib/auth";
import Dashboard from "@/components/Dashboard";

export default function DashboardPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
      return;
    }

    setChecked(true);

    // Schedule a redirect exactly when the token expires so the user is
    // kicked out automatically rather than receiving 401 errors mid-session.
    const ms = msUntilExpiry();
    if (ms > 0) {
      const id = setTimeout(() => {
        router.replace("/login");
      }, ms);
      return () => clearTimeout(id);
    }
  }, [router]);

  if (!checked) {
    return null;
  }

  return <Dashboard />;
}
