"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Loader from "@/components/ui/Loader";
import { useAuth } from "@/context/AuthContext";

export default function RootRoutePage() {
  const router = useRouter();
  const { user, authReady, authenticated } = useAuth();

  useEffect(() => {
    if (!authReady) return;

    if (!authenticated || !user) {
      router.replace("/login");
      return;
    }

    if ((user.role ?? "").toLowerCase() === "admin") {
      router.replace("/admin");
      return;
    }

    router.replace("/dashboard");
  }, [authReady, authenticated, router, user]);

  return <Loader />;
}
