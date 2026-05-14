/**
 * Canonical auth entry point.
 *
 * RULE 1 — SINGLE SOURCE OF TRUTH
 * All auth imports across the codebase must come from this module.
 * The underlying implementation lives in context/AuthContext.tsx.
 *
 * Usage:
 *   import { useAuth, AuthProvider } from "@/providers/AuthProvider";
 *   const { user, login, logout } = useAuth();
 */

export {
  AuthProvider,
  useAuth,
  type AuthContextValue,
  type User,
  type ApprovalStatus,
} from "@/context/AuthContext";
