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
    if (loading) return;

    if (user === null) {
      window.location.href = "/login";
      return;
    }

    // Redirect non-admin authenticated users to the client dashboard
    if ((user.role ?? "").toLowerCase() !== "admin") {
      window.location.href = "/dashboard";
    }
  }, [loading, user]);

  // ⏳ While checking auth
  if (loading) return <Loader />;

  // ⛔ Prevent rendering until role is confirmed
  if (!user || (user.role ?? "").toLowerCase() !== "admin") return null;

  // ✅ Authorized admin
  return <>{children}</>;
}
