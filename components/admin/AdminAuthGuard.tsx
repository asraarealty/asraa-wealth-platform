"use client";

import { useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Loader from "@/components/ui/Loader";

interface Props {
  children: ReactNode;
}

export default function AdminAuthGuard({ children }: Props) {
  const { user, authReady, sessionHydrated, authenticated, isRefreshing } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authReady || !sessionHydrated || isRefreshing) return;

    if (!authenticated || user === null) {
      router.replace("/login");
      return;
    }

    // Redirect non-admin authenticated users to the client dashboard
    if ((user.role ?? "").toLowerCase() !== "admin") {
      router.replace("/dashboard");
    }
  }, [authReady, sessionHydrated, authenticated, isRefreshing, router, user]);

  // ⏳ While checking auth
  if (!authReady || !sessionHydrated || isRefreshing) return <Loader />;

  // ⛔ Prevent rendering until role is confirmed
  if (!user || (user.role ?? "").toLowerCase() !== "admin") return null;

  // ✅ Authorized admin
  return <>{children}</>;
}
