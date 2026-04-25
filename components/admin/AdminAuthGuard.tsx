"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Loader from "@/components/ui/Loader";

/**
 * Admin route guard (COOKIE-BASED AUTH)
 *
 * - Waits for auth to load
 * - Redirects if user not logged in
 * - Redirects if not admin
 */
export default function AdminAuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else if (user.role !== "admin") {
        router.replace("/dashboard");
      }
    }
  }, [user, loading, router]);

  if (loading) return <Loader />;
  if (!user) return null;

  return <>{children}</>;
}
