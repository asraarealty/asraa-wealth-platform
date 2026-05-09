"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Loader from "@/components/ui/Loader";

interface Props {
  children: ReactNode;
}

/**
 * ApprovalGuard — checks the authenticated user's approval_status and
 * redirects to the appropriate status page before rendering protected content.
 *
 * Status routing:
 *   pending   → /pending-approval
 *   rejected  → /rejected
 *   suspended → auto-logout → /suspended
 *   approved  → render children normally
 *   (no status / undefined) → treated as approved (backend default)
 */
export default function ApprovalGuard({ children }: Props) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      // Not authenticated — leave redirect to the auth guard above this
      return;
    }

    const status = user.approval_status;

    if (status === "suspended") {
      // Clear session and redirect; navigate to /suspended regardless of whether
      // the server-side logout call succeeds (the token is already cleared locally).
      void logout().finally(() => {
        router.replace("/suspended");
      });
      return;
    }

    if (status === "pending") {
      router.replace("/pending-approval");
      return;
    }

    if (status === "rejected") {
      router.replace("/rejected");
      return;
    }
  }, [loading, user, logout, router]);

  if (loading) return <Loader />;

  // Block render while redirecting
  if (!user) return null;

  const status = user.approval_status;
  if (status === "suspended" || status === "pending" || status === "rejected") {
    return null;
  }

  return <>{children}</>;
}

