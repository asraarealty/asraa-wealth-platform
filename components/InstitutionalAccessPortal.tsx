"use client";

import { useState, type FormEvent } from "react";
import Header from "@/components/Header";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  activateInvitation,
  requestAdvisoryAccess,
  type RequestAdvisoryAccessPayload,
} from "@/lib/api";
import { ApiError, NetworkError } from "@/lib/fetcher";

type AccessTab = "existing-client" | "activate-invitation" | "request-access";

const TABS: Array<{ id: AccessTab; label: string; href: string }> = [
  { id: "existing-client", label: "Existing Client", href: "/login" },
  {
    id: "activate-invitation",
    label: "Activate Invitation",
    href: "/activate-invitation",
  },
  {
    id: "request-access",
    label: "Request Advisory Access",
    href: "/request-access",
  },
];

const CONTACT_METHODS = ["Phone", "Email", "WhatsApp", "Video Call"] as const;

const LIFECYCLE_STEPS: Array<{ key: "approval" | "invitation" | "activation" | "workspace"; label: string }> = [
  { key: "approval", label: "Advisor approval" },
  { key: "invitation", label: "Invitation issued" },
  { key: "activation", label: "Client activation" },
  { key: "workspace", label: "Secure workspace" },
];

function LifecycleRail({
  activeStep,
}: {
  activeStep: "approval" | "invitation" | "activation" | "workspace";
}) {
  const activeIndex = LIFECYCLE_STEPS.findIndex((step) => step.key === activeStep);
  return (
    <div className="rounded-xl border border-sky-400/15 bg-[#071126]/70 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-200/80">
        Onboarding lifecycle
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {LIFECYCLE_STEPS.map((step, index) => {
          const isActive = index === activeIndex;
          const isDone = index < activeIndex;
          return (
            <div
              key={step.key}
              className={`rounded-lg border px-3 py-2 text-xs ${
                isActive
                  ? "border-sky-300/60 bg-sky-500/20 text-sky-100"
                  : isDone
                    ? "border-emerald-300/30 bg-emerald-500/10 text-emerald-100"
                    : "border-white/10 bg-white/5 text-slate-300"
              }`}
            >
              {step.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function InstitutionalAccessPortal({
  initialTab = "existing-client",
}: {
  initialTab?: AccessTab;
}) {
  const router = useRouter();
  const { login } = useAuth();

  const [activeTab, setActiveTab] = useState<AccessTab>(initialTab);
  const [tabLoading, setTabLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [invitationToken, setInvitationToken] = useState("");
  const [invitationPassword, setInvitationPassword] = useState("");
  const [invitationConfirmPassword, setInvitationConfirmPassword] = useState("");
  const [invitationPending, setInvitationPending] = useState(false);

  const [accessPayload, setAccessPayload] = useState<RequestAdvisoryAccessPayload>({
    fullName: "",
    email: "",
    phone: "",
    estimatedAum: "",
    investmentInterests: "",
    preferredContactMethod: CONTACT_METHODS[0],
  });
  const [accessSubmitted, setAccessSubmitted] = useState(false);

  function switchTab(id: AccessTab, href: string) {
    setActiveTab(id);
    setError(null);
    setSuccess(null);
    setInvitationPending(false);
    router.replace(href);
  }

  async function submitExistingClient(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (tabLoading) return;
    setTabLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const me = await login(email, password);
      const role = (me.role || "").toString().trim().toLowerCase();
      router.replace(role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      if (err instanceof NetworkError) {
        setError("Server not reachable. Try again.");
      } else if (err instanceof ApiError && err.status === 401) {
        setError("Invalid email or password.");
      } else {
        setError(err instanceof Error ? err.message : "Login failed. Please try again.");
      }
    } finally {
      setTabLoading(false);
    }
  }

  async function submitInvitationActivation(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (tabLoading) return;
    if (invitationPassword !== invitationConfirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setTabLoading(true);
    setError(null);
    setSuccess(null);
    setInvitationPending(false);

    try {
      await activateInvitation({
        token: invitationToken,
        password: invitationPassword,
        confirmPassword: invitationConfirmPassword,
      });
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setInvitationPending(true);
        setError("Invitation not found yet. Your advisor may still be issuing access.");
      } else if (err instanceof ApiError && err.status === 409) {
        setError("This invitation has already been activated. Please sign in to continue.");
      } else if (err instanceof ApiError && err.status === 410) {
        setError("This invitation has expired. Ask your advisor to issue a new invitation.");
      } else if (err instanceof NetworkError) {
        setError("Unable to reach activation service. Try again.");
      } else {
        setError(err instanceof Error ? err.message : "Unable to activate invitation.");
      }
    } finally {
      setTabLoading(false);
    }
  }

  async function submitAccessRequest(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (tabLoading) return;
    setTabLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await requestAdvisoryAccess(accessPayload);
      setAccessSubmitted(true);
      setSuccess("Access request submitted. Your advisor will review and issue an invitation after onboarding approval.");
    } catch (err) {
      if (err instanceof NetworkError) {
        setError("Unable to submit request right now. Please try again.");
      } else {
        setError(err instanceof Error ? err.message : "Access request failed.");
      }
    } finally {
      setTabLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#040915]">
      <Header />
      <main className="flex-1 flex flex-col pt-16">
        <div className="flex flex-1 flex-col lg:flex-row">
          <div className="flex flex-col justify-center px-8 py-16 lg:px-16 xl:px-24 lg:w-[55%]">
            <p className="mb-4 inline-flex w-fit rounded-full border border-sky-400/25 bg-sky-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-sky-200">
              Institutional Access
            </p>
            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-extrabold leading-tight tracking-tight mb-6 text-white">
              Private Wealth <br /> Operating System
            </h1>
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-2xl mb-8">
              Access is provisioned by your advisor after onboarding approval.
            </p>
            <ul className="space-y-4 max-w-2xl">
              <li className="text-gray-300 text-sm">✔ Advisor-managed onboarding</li>
              <li className="text-gray-300 text-sm">✔ Secure document ingestion</li>
              <li className="text-gray-300 text-sm">✔ KYC verification checkpoints</li>
              <li className="text-gray-300 text-sm">✔ Dedicated advisor-led relationship</li>
            </ul>
          </div>

          <div className="flex flex-col items-center justify-center px-6 py-12 lg:py-0 lg:w-[45%]">
            <div className="w-full max-w-lg rounded-2xl p-6 sm:p-8 shadow-2xl bg-[#0b1a3a]/85 border border-sky-400/25 backdrop-blur-xl">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => switchTab(tab.id, tab.href)}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                      activeTab === tab.id
                        ? "border-sky-300 bg-sky-500/25 text-sky-100"
                        : "border-sky-400/20 bg-[#071126] text-slate-300 hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="mt-5">
                {activeTab === "existing-client" && (
                  <form onSubmit={submitExistingClient} className="space-y-4">
                    <p className="text-sm text-slate-300">Access your activated wealth workspace.</p>
                    <input
                      type="email"
                      placeholder="Email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-lg bg-[#020817]/50 border border-sky-400/20 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-sky-400"
                    />
                    <input
                      type="password"
                      placeholder="Password"
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-lg bg-[#020817]/50 border border-sky-400/20 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-sky-400"
                    />
                    <button
                      type="submit"
                      disabled={tabLoading}
                      className="w-full rounded-lg bg-gradient-to-r from-sky-400 to-blue-500 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {tabLoading ? "Signing in..." : "Sign In"}
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push("/forgot-password")}
                      className="text-sm text-sky-300 hover:text-sky-200"
                    >
                      Forgot Password
                    </button>
                  </form>
                )}

                {activeTab === "activate-invitation" && (
                  <form onSubmit={submitInvitationActivation} className="space-y-4">
                    <p className="text-sm text-slate-300">Activate your advisor-issued invitation.</p>
                    <input
                      type="text"
                      placeholder="Invitation token"
                      required
                      value={invitationToken}
                      onChange={(e) => setInvitationToken(e.target.value)}
                      className="w-full rounded-lg bg-[#020817]/50 border border-sky-400/20 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-sky-400"
                    />
                    <input
                      type="password"
                      placeholder="Password"
                      required
                      autoComplete="new-password"
                      value={invitationPassword}
                      onChange={(e) => setInvitationPassword(e.target.value)}
                      className="w-full rounded-lg bg-[#020817]/50 border border-sky-400/20 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-sky-400"
                    />
                    <input
                      type="password"
                      placeholder="Confirm password"
                      required
                      autoComplete="new-password"
                      value={invitationConfirmPassword}
                      onChange={(e) => setInvitationConfirmPassword(e.target.value)}
                      className="w-full rounded-lg bg-[#020817]/50 border border-sky-400/20 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-sky-400"
                    />
                    <button
                      type="submit"
                      disabled={tabLoading}
                      className="w-full rounded-lg bg-gradient-to-r from-sky-400 to-blue-500 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {tabLoading ? "Activating..." : "Activate Invitation"}
                    </button>
                    {invitationPending && (
                      <p className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                        Your invitation is still being processed. Please wait for advisor confirmation.
                      </p>
                    )}
                  </form>
                )}

                {activeTab === "request-access" && (
                  <form onSubmit={submitAccessRequest} className="space-y-4">
                    <p className="text-sm text-slate-300">Request access to Asraa Private Wealth Operating System.</p>
                    <input
                      type="text"
                      placeholder="Full name"
                      required
                      value={accessPayload.fullName}
                      onChange={(e) => setAccessPayload((prev) => ({ ...prev, fullName: e.target.value }))}
                      className="w-full rounded-lg bg-[#020817]/50 border border-sky-400/20 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-sky-400"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      required
                      value={accessPayload.email}
                      onChange={(e) => setAccessPayload((prev) => ({ ...prev, email: e.target.value }))}
                      className="w-full rounded-lg bg-[#020817]/50 border border-sky-400/20 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-sky-400"
                    />
                    <input
                      type="tel"
                      placeholder="Phone"
                      required
                      value={accessPayload.phone}
                      onChange={(e) => setAccessPayload((prev) => ({ ...prev, phone: e.target.value }))}
                      className="w-full rounded-lg bg-[#020817]/50 border border-sky-400/20 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-sky-400"
                    />
                    <input
                      type="text"
                      placeholder="Estimated AUM"
                      required
                      value={accessPayload.estimatedAum}
                      onChange={(e) => setAccessPayload((prev) => ({ ...prev, estimatedAum: e.target.value }))}
                      className="w-full rounded-lg bg-[#020817]/50 border border-sky-400/20 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-sky-400"
                    />
                    <textarea
                      placeholder="Investment interests"
                      required
                      rows={3}
                      value={accessPayload.investmentInterests}
                      onChange={(e) => setAccessPayload((prev) => ({ ...prev, investmentInterests: e.target.value }))}
                      className="w-full rounded-lg bg-[#020817]/50 border border-sky-400/20 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-sky-400"
                    />
                    <select
                      value={accessPayload.preferredContactMethod}
                      onChange={(e) =>
                        setAccessPayload((prev) => ({
                          ...prev,
                          preferredContactMethod:
                            e.target.value as RequestAdvisoryAccessPayload["preferredContactMethod"],
                        }))
                      }
                      className="w-full rounded-lg bg-[#020817]/50 border border-sky-400/20 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-sky-400"
                    >
                      {CONTACT_METHODS.map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      disabled={tabLoading || accessSubmitted}
                      className="w-full rounded-lg bg-gradient-to-r from-sky-400 to-blue-500 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {tabLoading ? "Submitting..." : accessSubmitted ? "Request Submitted" : "Request Advisory Access"}
                    </button>
                  </form>
                )}
              </div>

              {(error || success) && (
                <div
                  className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
                    error
                      ? "border-red-400/30 bg-red-500/10 text-red-200"
                      : "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                  }`}
                >
                  {error ?? success}
                </div>
              )}

              <div className="mt-5">
                <LifecycleRail
                  activeStep={
                    activeTab === "request-access"
                      ? "approval"
                      : activeTab === "activate-invitation"
                        ? "activation"
                        : "workspace"
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
