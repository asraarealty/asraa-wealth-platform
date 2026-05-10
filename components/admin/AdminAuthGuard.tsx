"use client";

import { useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Loader from "@/components/ui/Loader";

interface Props {
  children: ReactNode;
}

export default function AdminAuthGuard({ children }: Props) {
  const { user, loading, authError, retryAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (authError) return;

    if (user === null) {
      console.warn("[AdminAuthGuard] Redirecting to /login because user is null after auth init", {
        path: typeof window !== "undefined" ? window.location.pathname : "unknown",
      });
      router.replace("/login");
      return;
    }

    // Redirect non-admin authenticated users to the client dashboard
    if ((user.role ?? "").toLowerCase() !== "admin") {
      console.warn("[AdminAuthGuard] Redirecting non-admin user to /dashboard", {
        role: user.role,
      });
      router.replace("/dashboard");
    }
  }, [loading, authError, user, router]);

  // ⏳ While checking auth
  if (loading) return <Loader />;

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

  // ⛔ Prevent rendering until role is confirmed
  if (!user || (user.role ?? "").toLowerCase() !== "admin") return null;

  // ✅ Authorized admin
  return <>{children}</>;
}
