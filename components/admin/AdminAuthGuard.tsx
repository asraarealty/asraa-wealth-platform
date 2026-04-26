"use client";

import { useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Loader from "@/components/ui/Loader";

interface Props {
  children: ReactNode;
}

export default function AdminAuthGuard({ children }: Props) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // ✅ Only redirect AFTER auth is fully resolved
    if (!loading && user === null) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  // ⛔ While checking auth → show loader
  if (loading) return <Loader />;

  // ⛔ If not authenticated → block UI (redirect already triggered)
  if (user === null) return null;

  // ✅ Authorized
  return <>{children}</>;
}
