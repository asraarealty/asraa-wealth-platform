"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { requestAdvisoryAccess, type AdvisoryAccessRequestPayload } from "@/lib/api";

export default function SignupForm() {
  const [form, setForm] = useState<AdvisoryAccessRequestPayload>({
    fullName: "",
    email: "",
    phone: "",
    city: "",
    estimatedNetWorth: "",
    primaryInterest: "",
    preferredContactMethod: "Email",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);

    try {
      await requestAdvisoryAccess(form);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Consultation request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#040915] px-4 py-8">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-7">
          <p className="text-xs uppercase tracking-[0.16em] text-sky-300/75">Advisor-managed enrollment</p>
          <h1 className="mt-2 text-3xl font-bold text-white tracking-tight">
            Request Advisory Access
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            Access is provisioned by your advisor after enrollment approval.
          </p>
        </div>

        <div className="bg-[#0b1a3a]/80 border border-sky-400/20 rounded-2xl p-7 shadow-2xl">
          {success ? (
            <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              Consultation request submitted. Your advisor team will review and provision access after approval.
            </div>
          ) : null}
          <form onSubmit={handleSubmit} className="space-y-4 mt-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" id="fullName" value={form.fullName} onChange={(value) => setForm((current) => ({ ...current, fullName: value }))} placeholder="Jane Smith" />
              <Field label="Email address" id="email" value={form.email} onChange={(value) => setForm((current) => ({ ...current, email: value }))} placeholder="jane@domain.com" type="email" />
              <Field label="Phone" id="phone" value={form.phone} onChange={(value) => setForm((current) => ({ ...current, phone: value }))} placeholder="+91 9XXXXXXXXX" />
              <Field label="City" id="city" value={form.city} onChange={(value) => setForm((current) => ({ ...current, city: value }))} placeholder="Mumbai" />
              <Field label="Estimated net worth" id="estimatedNetWorth" value={form.estimatedNetWorth} onChange={(value) => setForm((current) => ({ ...current, estimatedNetWorth: value }))} placeholder="25000000" />
              <Field label="Primary interest" id="primaryInterest" value={form.primaryInterest} onChange={(value) => setForm((current) => ({ ...current, primaryInterest: value }))} placeholder="Portfolio advisory" />
            </div>
            <div>
              <label htmlFor="preferredContactMethod" className="block text-sm font-medium text-slate-200 mb-1.5">Preferred contact method</label>
              <select
                id="preferredContactMethod"
                required
                value={form.preferredContactMethod}
                onChange={(event) => setForm((current) => ({ ...current, preferredContactMethod: event.target.value }))}
                className="w-full rounded-lg bg-[#020817]/60 border border-sky-400/20 text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/60"
              >
                <option>Email</option>
                <option>Phone</option>
                <option>WhatsApp</option>
              </select>
            </div>
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-slate-200 mb-1.5">Notes</label>
              <textarea
                id="notes"
                rows={4}
                value={form.notes}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Share timeline, investment context, or advisor expectations."
                className="w-full rounded-lg bg-[#020817]/60 border border-sky-400/20 text-white placeholder-slate-500 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/60"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 rounded-lg px-4 py-2.5 text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
            className="w-full bg-gradient-to-r from-sky-400 to-blue-500 hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-2.5 px-4 rounded-lg transition text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/70 flex items-center justify-center gap-2"
            >
              {loading && (
                <svg
                  className="animate-spin h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              )}
              {loading ? "Submitting…" : "Request Consultation"}
            </button>

            <p className="text-center text-sm text-slate-400">
              Already provisioned?{" "}
              <Link href="/login" className="text-sky-300 hover:text-sky-200 transition">Existing Client Login</Link>
              {" · "}
              <Link href="/activate-invitation" className="text-sky-300 hover:text-sky-200 transition">Activate Invitation</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  id,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: "text" | "email";
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-200 mb-1.5">{label}</label>
      <input
        id={id}
        type={type}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg bg-[#020817]/60 border border-sky-400/20 text-white placeholder-slate-500 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400/60"
      />
    </div>
  );
}
