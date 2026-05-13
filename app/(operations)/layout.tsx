"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import ApprovalGuard from "@/components/ApprovalGuard";
import Loader from "@/components/ui/Loader";
import { useAuth } from "@/context/AuthContext";
import OperationsNav from "@/components/properties/OperationsNav";

function OperationsAuthGuard({ children }: { children: ReactNode }) {
  const { user, authInitialized, isHydrating, authError, retryAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authInitialized || isHydrating || authError) return;
    if (user === null) {
      router.replace("/login");
    }
  }, [authInitialized, isHydrating, authError, user, router]);

  if (!authInitialized || isHydrating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card rounded-2xl p-6 border border-white/10 max-w-md w-full text-center">
          <h2 className="text-lg text-white font-semibold">Unable to verify session</h2>
          <p className="text-sm text-white/50 mt-2">Please retry authentication and continue.</p>
          <button
            type="button"
            onClick={retryAuth}
            className="mt-4 neon-btn rounded-xl px-4 py-2 text-sm"
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

export default function OperationsLayout({ children }: { children: ReactNode }) {
  return (
    <OperationsAuthGuard>
      <ApprovalGuard>
        <div className="min-h-screen text-white p-4 sm:p-6 space-y-4" style={{ background: "linear-gradient(160deg, #050b18 0%, #071426 100%)" }}>
          <header className="glass-card border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-white">Commercial Operations</h1>
                <p className="text-sm text-white/45 mt-1">Enterprise operational layer for real-estate lifecycle management</p>
              </div>
              <Link
                href="/dashboard"
                className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border border-white/10 text-white/70 hover:text-white transition-colors"
              >
                Back to Wealth Dashboard
              </Link>
            </div>
            <OperationsNav />
          </header>
          {children}
        </div>
      </ApprovalGuard>
    </OperationsAuthGuard>
  );
}
