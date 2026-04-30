"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function StocksRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/portfolio");
  }, [router]);
  return null;
}
