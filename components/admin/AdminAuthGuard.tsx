"use client";

import { useEffect, ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import Loader from "@/components/ui/Loader";

interface Props {
  children: ReactNode;
}

export default function AdminAuthGuard({ children }: Props) {
  const { user, loading } = useAuth();

  useEffect(() => {
    // 🔥 FORCE redirect (no router issues)
    if (!loading && user === null) {
      window.location.href = "/login";
    }
  }, [loading, user]);

  // ⏳ While checking auth
  if (loading) return <Loader />;

  // ⛔ Prevent rendering if not logged in
  if (!user) return null;

  // ✅ Authorized
  return <>{children}</>;
}
