"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import ApprovalGuard from "@/components/ApprovalGuard";
import Loader from "@/components/ui/Loader";

function DashboardAuthGuard({ children }: { children: ReactNode }) {
  const { user, authInitialized, isHydrating, authError, retryAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authInitialized || isHydrating) return;
    if (authError) return;
    if (user === null) {
      console.warn("[DashboardAuthGuard] Redirecting to /login because user is null after auth init", {
        path: typeof window !== "undefined" ? window.location.pathname : "unknown",
      });
      router.replace("/login");
    }
  }, [authInitialized, isHydrating, authError, user, router]);

  if (!authInitialized || isHydrating) return <Loader />;
  if (authError) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div
          className="w-full max-w-md rounded-2xl p-6 text-center"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <h2 className="text-lg font-semibold text-white">Unable to verify session</h2>
          <p className="mt-2 text-sm text-gray-400">
            We could not reach the auth service. Please retry.
          </p>
          <button
            onClick={retryAuth}
            className="mt-4 inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-black"
            style={{ background: "linear-gradient(90deg, #C9A227, #d4af4a)" }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  if (!user) return null;

  return <>{children}</>;
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardAuthGuard>
      <ApprovalGuard>{children}</ApprovalGuard>
    </DashboardAuthGuard>
  );
}
