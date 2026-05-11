"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Loader from "@/components/ui/Loader";
import { useAuth } from "@/context/AuthContext";
import { resolveAuthLandingTarget } from "@/lib/authRouting";

export default function PublicAuthGuard({ children }: { children: ReactNode }) {
  const { user, initialized, loading } = useAuth();
  const router = useRouter();

  const redirectPath = useMemo(
    () => (user ? resolveAuthLandingTarget(user).path : null),
    [user]
  );

  useEffect(() => {
    if (!initialized || loading || !redirectPath) return;
    router.replace(redirectPath);
  }, [initialized, loading, redirectPath, router]);

  if (!initialized || loading) {
    return <Loader />;
  }

  if (redirectPath) {
    return <Loader />;
  }

  return <>{children}</>;
}
