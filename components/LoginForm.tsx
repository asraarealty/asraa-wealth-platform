"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ApiError, NetworkError } from "@/lib/fetcher";
import { useToast } from "@/context/ToastContext";

const REQUIRED_FIELDS_ERROR_MESSAGE = "Email and password are required.";

export default function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    const normalizedEmail = email.trim();
    const normalizedPassword = password.trim();
    if (!normalizedEmail || !normalizedPassword) {
      setError(REQUIRED_FIELDS_ERROR_MESSAGE);
      showToast(REQUIRED_FIELDS_ERROR_MESSAGE, "error");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const me = await login(normalizedEmail, normalizedPassword); // Keep this line

      if (!me) {
        setError("Unable to fetch user data");
        showToast("Unable to fetch user data", "error");
        return;
      }

      // 🔥 robust role handling
      const role = (me.role || "").toString().trim().toLowerCase();
      const status = (me.approval_status || "").toString().trim().toLowerCase();

      // Handle non-approved statuses before role-based routing
      if (status === "suspended") {
        showToast("Your account is suspended.", "error");
        router.replace("/suspended");
        return;
      }
      if (status === "pending") {
        showToast("Your account is pending approval.", "info");
        router.replace("/pending-approval");
        return;
      }
      if (status === "rejected") {
        showToast("Your account approval was rejected.", "error");
        router.replace("/rejected");
        return;
      }

      // 🔥 safe redirect (replace avoids back button going to login)
      if (role === "admin") {
        showToast("Welcome back.", "success");
        router.replace("/admin");
      } else {
        showToast("Welcome back.", "success");
        router.replace("/dashboard");
      }
    } catch (err) {
      if (err instanceof NetworkError) {
        setError("Server not reachable. Try again.");
        showToast("Server not reachable. Try again.", "error");
      } else if (err instanceof ApiError) {
        if (err.status === 401) {
          setError("Invalid email or password.");
          showToast("Invalid email or password.", "error");
        } else if (err.status === 403) {
          setError("Access denied.");
          showToast("Access denied.", "error");
        } else {
          setError(err.message);
          showToast(err.message, "error");
        }
      } else {
        setError("Login failed. Please try again.");
        showToast("Login failed. Please try again.", "error");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="w-full rounded-2xl p-8 shadow-2xl"
      style={{
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.09)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,229,255,0.05)",
      }}
    >
      <h2 className="text-2xl font-bold text-white mb-1 tracking-tight">Welcome back</h2>
      <p className="text-sm text-white/40 mb-7">Sign in to your account to continue</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="login-email" className="text-sm font-medium text-white/55">
            Email address
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
            </span>
            <input
              id="login-email"
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full neon-input rounded-xl pl-10 pr-4 py-3 text-sm"
            />
          </div>
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="login-password" className="text-sm font-medium text-white/55">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-[#00E5FF]/70 hover:text-[#00E5FF] transition-colors duration-200"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 pointer-events-none">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25z" />
              </svg>
            </span>
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full neon-input rounded-xl pl-10 pr-11 py-3 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-0 top-0 h-full flex items-center px-3.5 text-white/30 hover:text-white/70 transition-colors duration-200"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm"
            style={{
              background: "rgba(255,77,109,0.08)",
              border: "1px solid rgba(255,77,109,0.2)",
              color: "#ff4d6d",
            }}
          >
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm-.75-4.75a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-1.5 0v4.5Zm.75-7.25a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full neon-btn py-3 rounded-xl text-sm flex items-center justify-center gap-2 mt-1"
        >
          {loading && (
            <svg className="animate-spin h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {loading ? "Signing in…" : "Sign In"}
        </button>

        {/* Sign up link */}
        <p className="text-center text-sm text-white/35">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-[#00E5FF]/80 hover:text-[#00E5FF] transition-colors duration-200 font-medium">
            Create account
          </Link>
        </p>
      </form>
    </div>
  );
}
