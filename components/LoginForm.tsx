"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { ApiError, NetworkError } from "@/lib/fetcher";
import { isOperationsRole } from "@/lib/authRouting";

export default function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;

    setError(null);
    setLoading(true);

    try {
      const me = await login(email, password); // Keep this line

      if (!me) {
        setError("Unable to fetch user data");
        return;
      }

      if (isOperationsRole(me.role)) {
        router.replace("/admin");
      } else {
        router.replace("/dashboard");
      }
    } catch (err) {
      if (err instanceof NetworkError) {
        setError("Server not reachable. Try again.");
      } else if (err instanceof ApiError) {
        if (err.status === 401) {
          setError("Invalid email or password.");
        } else if (err.status === 403) {
          setError("Access denied.");
        } else {
          setError(err.message);
        }
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full rounded-2xl p-8 shadow-2xl bg-[#0b1a3a]/85 border border-sky-400/25 backdrop-blur-xl">
      <h2 className="text-xl font-bold text-white mb-1">Welcome back</h2>
      <p className="mb-5 text-xs text-slate-300">Existing Client Login</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email */}
        <input
          type="email"
          placeholder="Email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 rounded bg-[#020817]/50 text-white outline-none border border-sky-400/15 focus:ring-2 focus:ring-sky-400"
        />

        {/* Password */}
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 rounded bg-[#020817]/50 text-white outline-none border border-sky-400/15 focus:ring-2 focus:ring-sky-400"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-2 text-gray-400"
          >
            👁
          </button>
        </div>

        {/* Error */}
        {error && <p className="text-red-400 text-sm">{error}</p>}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-gradient-to-r from-sky-400 to-blue-500 text-white rounded disabled:opacity-50 shadow-[0_8px_20px_rgba(56,189,248,0.25)]"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        {/* Links */}
        <div className="flex justify-between text-sm text-gray-400">
          <Link href="/forgot-password">Forgot password?</Link>
          <Link href="/request-access">Request Advisory Access</Link>
        </div>
        <div className="pt-2 text-center">
          <Link href="/activate-invitation" className="text-xs text-sky-300 hover:text-sky-200">
            Activate Invitation
          </Link>
          <span className="mx-2 text-slate-600">•</span>
          <Link href="/login" className="text-xs text-slate-300 hover:text-white">
            Advisor/Admin Login
          </Link>
        </div>
      </form>
    </div>
  );
}
