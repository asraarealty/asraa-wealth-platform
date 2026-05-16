"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Loader from "@/components/ui/Loader";
import { useAuth } from "@/context/AuthContext";

export default function RootRoutePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if ((user.role ?? "").toLowerCase() === "admin") {
      router.replace("/admin");
      return;
    }

    router.replace("/dashboard");
  }, [loading, router, user]);

  return <Loader />;
}
