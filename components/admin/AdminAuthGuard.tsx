"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Loader from "@/components/ui/Loader";

/**
 * Client-side auth guard for admin routes.
 *
 * While the session is being restored (loading), renders a spinner.
 * Once loading is complete, redirects to /login if no token is present.
 * Otherwise renders children normally.
 *
 * This complements the server-side proxy check (proxy.ts) by guarding
 * against cases where the cookie has expired but localStorage still
 * hasn't been cleared, or when navigating client-side without a page reload.
 */
export default function AdminAuthGuard({ children }: { children: ReactNode }) {
  const { token, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !token) {
      router.replace("/login");
    }
  }, [loading, token, router]);

  if (loading) return <Loader />;
  if (!token) return null;

  return <>{children}</>;
}
