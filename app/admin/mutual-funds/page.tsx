"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MutualFundsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/assets");
  }, [router]);
  return null;
}
