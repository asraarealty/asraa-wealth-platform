"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  activateInvitation,
  fetchInvitationPreview,
  type InvitationPreviewResponse,
} from "@/lib/api";

const DEFAULT_DOCUMENTS = [
  "Identity proof",
  "Address proof",
  "Portfolio statements",
  "Bank confirmation",
] as const;

export default function ActivateInvitationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [preview, setPreview] = useState<InvitationPreviewResponse | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [acceptInvitation, setAcceptInvitation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    let active = true;
    void (async () => {
      try {
        const response = await fetchInvitationPreview(token);
        if (!active) return;
        setPreview(response);
      } catch {
        if (!active) return;
        setPreview(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  const requestedDocuments = useMemo(() => {
    if (preview?.requestedDocuments?.length) return preview.requestedDocuments;
    return [...DEFAULT_DOCUMENTS];
  }, [preview?.requestedDocuments]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError(null);

    if (!token) {
      setError("Missing invitation token.");
      return;
    }
    if (!acceptInvitation) {
      setError("Please accept the onboarding invitation.");
      return;
    }
    if (!password || password !== confirm) {
      setError("Passwords must match.");
      return;
    }

    setLoading(true);
    try {
      await activateInvitation({ token, password, acceptInvitation: true });
      router.replace("/onboarding/access");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invitation activation failed.");
    } finally {
      setLoading(false);
    }
  }

  const progressStep = Math.max(1, Math.min(preview?.progressStep ?? 2, preview?.progressTotal ?? 4));
  const progressTotal = Math.max(preview?.progressTotal ?? 4, progressStep);
  const progressPct = Math.round((progressStep / progressTotal) * 100);

  return (
    <div className="min-h-screen bg-[#040915] px-4 py-10">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <section className="rounded-2xl border border-sky-400/20 bg-[#0b1a3a]/80 p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-sky-300/75">Invitation activation</p>
          <h1 className="mt-2 text-2xl font-bold text-white">Activate Client Invitation</h1>
          <p className="mt-2 text-sm text-slate-300">
            Complete secure activation to access your advisor-managed onboarding workspace.
          </p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="grid gap-3 text-sm sm:grid-cols-2">
            <Info label="Assigned advisor" value={preview?.assignedAdvisor || "Assigned advisor will appear after validation"} />
            <Info label="Onboarding status" value={preview?.onboardingStatus || "Pending activation"} />
            <Info label="Activation progress" value={`${progressStep}/${progressTotal} checkpoints`} />
            <Info label="Progress completion" value={`${progressPct}%`} />
          </div>
          <div className="mt-4 h-2 rounded-full bg-white/10">
            <div className="h-2 rounded-full bg-gradient-to-r from-sky-400 to-blue-500" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="mt-3 text-xs text-slate-400">
            {preview?.advisorComment || "Your advisor will review submission artifacts after activation and approve onboarding access."}
          </p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-sm font-semibold text-white">Requested documents</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {requestedDocuments.map((doc) => (
              <span key={doc} className="rounded-full border border-sky-300/25 bg-sky-500/10 px-2.5 py-1 text-xs text-sky-100">{doc}</span>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm text-slate-200">Set password</span>
              <input
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg bg-[#020817]/60 border border-sky-400/20 text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/60"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm text-slate-200">Confirm password</span>
              <input
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                className="w-full rounded-lg bg-[#020817]/60 border border-sky-400/20 text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/60"
              />
            </label>
            <label className="flex items-start gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={acceptInvitation}
                onChange={(event) => setAcceptInvitation(event.target.checked)}
                className="mt-0.5"
              />
              I accept this onboarding invitation and understand that my advisor manages onboarding operations internally.
            </label>
            {error ? <p className="text-sm text-red-300">{error}</p> : null}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-sky-400 to-blue-500 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Activating…" : "Activate Invitation"}
            </button>
            <p className="text-center text-xs text-slate-400">
              <Link href="/request-access" className="text-sky-300 hover:text-sky-200">Request Advisory Access</Link>
              <span className="mx-2 text-slate-600">•</span>
              <Link href="/login" className="text-sky-300 hover:text-sky-200">Existing Client Login</Link>
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-white">{value}</p>
    </div>
  );
}

