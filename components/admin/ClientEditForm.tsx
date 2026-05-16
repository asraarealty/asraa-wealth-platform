"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type {
  ClientApprovalStatus,
  ClientOperationalStatus,
  ClientProfile,
  ClientUpdatePayload,
} from "@/lib/services/clientService";

interface ClientFormState {
  name: string;
  email: string;
  phone: string;
  address: string;
  dob: string;
  netWorth: string;
  riskProfile: string;
  incomeBracket: string;
  investmentPreference: string;
  relationshipManager: string;
  leadSource: string;
  tags: string;
  campaignSegmentation: string;
  status: ClientOperationalStatus;
  approvalStatus: ClientApprovalStatus;
  subscriptionTier: string;
  onboardingStatus: string;
  notes: string;
  notificationEmail: boolean;
  notificationWhatsapp: boolean;
  notificationSms: boolean;
  notificationPush: boolean;
}

function createInitialState(client?: ClientProfile | null): ClientFormState {
  return {
    name: client?.name ?? "",
    email: client?.email ?? "",
    phone: client?.phone ?? "",
    address: client?.address ?? "",
    dob: client?.dob ?? "",
    netWorth: client?.netWorth != null ? String(client.netWorth) : "",
    riskProfile: client?.riskProfile ?? "",
    incomeBracket: client?.incomeBracket ?? "",
    investmentPreference: client?.investmentPreference ?? "",
    relationshipManager: client?.relationshipManager ?? "",
    leadSource: client?.leadSource ?? "",
    tags: client?.tags?.join(", ") ?? "",
    campaignSegmentation: client?.campaignSegmentation ?? "",
    status: client?.status ?? "active",
    approvalStatus: client?.approvalStatus ?? "pending",
    subscriptionTier: client?.subscriptionTier ?? "standard",
    onboardingStatus: client?.onboardingStatus ?? "pipeline",
    notes: client?.notes ?? "",
    notificationEmail: Boolean(client?.notificationPreferences.email),
    notificationWhatsapp: Boolean(client?.notificationPreferences.whatsapp),
    notificationSms: Boolean(client?.notificationPreferences.sms),
    notificationPush: Boolean(client?.notificationPreferences.push),
  };
}

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[1.4rem] border border-white/8 bg-white/[0.035] p-5">
      <div className="mb-4">
        <p className="text-[10px] uppercase tracking-[0.18em] text-sky-300/70">Client intelligence</p>
        <h2 className="mt-1 text-base font-semibold text-white">{title}</h2>
        <p className="mt-1 text-sm text-slate-400">{description}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({ label, children, fullWidth = false }: { label: string; children: React.ReactNode; fullWidth?: boolean }) {
  return (
    <label className={`block ${fullWidth ? "md:col-span-2" : ""}`}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

const INPUT_CLASS = "w-full rounded-2xl border border-white/10 bg-[#071229] px-4 py-3 text-sm text-white outline-none transition focus:border-sky-300/40 focus:bg-sky-500/[0.08]";

export function ClientEditForm({
  mode,
  client,
  error,
  submitting,
  onSubmit,
}: {
  mode: "create" | "edit";
  client?: ClientProfile | null;
  error?: string | null;
  submitting?: boolean;
  onSubmit: (payload: ClientUpdatePayload & { status: ClientOperationalStatus }) => Promise<void>;
}) {
  const [form, setForm] = useState<ClientFormState>(() => createInitialState(client));

  useEffect(() => {
    setForm(createInitialState(client));
  }, [client]);

  const title = useMemo(() => (mode === "create" ? "Create client workspace" : "Edit client workspace"), [mode]);

  function setField<K extends keyof ClientFormState>(key: K, value: ClientFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      address: form.address.trim() || undefined,
      dob: form.dob || undefined,
      netWorth: form.netWorth ? Number(form.netWorth) : undefined,
      riskProfile: form.riskProfile || undefined,
      incomeBracket: form.incomeBracket || undefined,
      investmentPreference: form.investmentPreference || undefined,
      relationshipManager: form.relationshipManager || undefined,
      leadSource: form.leadSource || undefined,
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      campaignSegmentation: form.campaignSegmentation || undefined,
      approvalStatus: form.approvalStatus,
      subscriptionTier: form.subscriptionTier || undefined,
      onboardingStatus: form.onboardingStatus || undefined,
      notes: form.notes.trim() || undefined,
      notificationPreferences: {
        email: form.notificationEmail,
        whatsapp: form.notificationWhatsapp,
        sms: form.notificationSms,
        push: form.notificationPush,
      },
      status: form.status,
    });
  }

  return (
    <div className="space-y-5 text-white">
      <div className="rounded-[1.5rem] border border-white/8 bg-[linear-gradient(145deg,rgba(17,35,74,0.82),rgba(7,15,37,0.78))] p-5 shadow-[0_18px_52px_rgba(0,8,26,0.42)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-sky-300/70">Institutional client operations</p>
            <h1 className="mt-1 text-2xl font-semibold text-white">{title}</h1>
            <p className="mt-1 text-sm text-slate-400">Maintain relationship, portfolio, and operational intelligence in one workflow.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/clients" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white">
              Back to clients
            </Link>
          </div>
        </div>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <Section title="Personal information" description="Identity, communication channels, and compliance-ready profile details.">
          <Field label="Name"><input required className={INPUT_CLASS} value={form.name} onChange={(event) => setField("name", event.target.value)} /></Field>
          <Field label="Email"><input required type="email" className={INPUT_CLASS} value={form.email} onChange={(event) => setField("email", event.target.value)} /></Field>
          <Field label="Phone"><input className={INPUT_CLASS} value={form.phone} onChange={(event) => setField("phone", event.target.value)} /></Field>
          <Field label="Date of birth"><input type="date" className={INPUT_CLASS} value={form.dob} onChange={(event) => setField("dob", event.target.value)} /></Field>
          <Field label="Address" fullWidth><textarea rows={3} className={INPUT_CLASS} value={form.address} onChange={(event) => setField("address", event.target.value)} /></Field>
        </Section>

        <Section title="Wealth intelligence" description="Economic profile, investment appetite, and strategic suitability data.">
          <Field label="Net worth"><input type="number" min="0" className={INPUT_CLASS} value={form.netWorth} onChange={(event) => setField("netWorth", event.target.value)} /></Field>
          <Field label="Risk profile">
            <select className={INPUT_CLASS} value={form.riskProfile} onChange={(event) => setField("riskProfile", event.target.value)}>
              <option value="">Select profile</option>
              <option value="conservative">Conservative</option>
              <option value="balanced">Balanced</option>
              <option value="growth">Growth</option>
              <option value="aggressive">Aggressive</option>
            </select>
          </Field>
          <Field label="Income bracket">
            <select className={INPUT_CLASS} value={form.incomeBracket} onChange={(event) => setField("incomeBracket", event.target.value)}>
              <option value="">Select bracket</option>
              <option value="emerging">Emerging HNI</option>
              <option value="hni">HNI</option>
              <option value="uhni">UHNI</option>
              <option value="institutional">Institutional</option>
            </select>
          </Field>
          <Field label="Investment preference"><input className={INPUT_CLASS} value={form.investmentPreference} onChange={(event) => setField("investmentPreference", event.target.value)} placeholder="Income, growth, preservation…" /></Field>
        </Section>

        <Section title="Relationship intelligence" description="Coverage ownership, acquisition source, and segmentation context for operations and campaigns.">
          <Field label="Relationship manager"><input className={INPUT_CLASS} value={form.relationshipManager} onChange={(event) => setField("relationshipManager", event.target.value)} /></Field>
          <Field label="Lead source"><input className={INPUT_CLASS} value={form.leadSource} onChange={(event) => setField("leadSource", event.target.value)} /></Field>
          <Field label="Tags" fullWidth><input className={INPUT_CLASS} value={form.tags} onChange={(event) => setField("tags", event.target.value)} placeholder="family office, priority, nri" /></Field>
          <Field label="Campaign segmentation" fullWidth><input className={INPUT_CLASS} value={form.campaignSegmentation} onChange={(event) => setField("campaignSegmentation", event.target.value)} placeholder="income desk / property onboarding / hedge campaign" /></Field>
        </Section>

        <Section title="Operational controls" description="Lifecycle state, approval flow, service tier, and notification routing.">
          <Field label="Client status">
            <select className={INPUT_CLASS} value={form.status} onChange={(event) => setField("status", event.target.value as ClientOperationalStatus)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
              <option value="archived">Archived</option>
            </select>
          </Field>
          <Field label="Approval status">
            <select className={INPUT_CLASS} value={form.approvalStatus} onChange={(event) => setField("approvalStatus", event.target.value as ClientApprovalStatus)}>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </Field>
          <Field label="Subscription tier"><input className={INPUT_CLASS} value={form.subscriptionTier} onChange={(event) => setField("subscriptionTier", event.target.value)} placeholder="standard / premium / private" /></Field>
          <Field label="Onboarding status"><input className={INPUT_CLASS} value={form.onboardingStatus} onChange={(event) => setField("onboardingStatus", event.target.value)} placeholder="pipeline / kyc / live" /></Field>
          <Field label="Relationship notes" fullWidth><textarea rows={4} className={INPUT_CLASS} value={form.notes} onChange={(event) => setField("notes", event.target.value)} placeholder="Latest meeting notes, escalation context, service notes…" /></Field>
          <Field label="Notification preferences" fullWidth>
            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-white/8 bg-[#071229] p-4 sm:grid-cols-4">
              {[
                ["notificationEmail", "Email"],
                ["notificationWhatsapp", "WhatsApp"],
                ["notificationSms", "SMS"],
                ["notificationPush", "Push"],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm text-slate-200">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-white/10 bg-white/5 accent-sky-400"
                    checked={Boolean(form[key as keyof ClientFormState])}
                    onChange={(event) => setField(key as keyof ClientFormState, event.target.checked as never)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </Field>
        </Section>

        {error ? <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Link href="/admin/clients" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-sky-400 px-5 py-3 text-sm font-semibold text-[#04102a] transition hover:bg-sky-300 disabled:opacity-50"
          >
            {submitting ? "Saving…" : mode === "create" ? "Create client" : "Save client changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
