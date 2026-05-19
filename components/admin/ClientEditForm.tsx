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
  whatsapp: string;
  address: string;
  dob: string;
  netWorth: string;
  riskProfile: string;
  incomeBracket: string;
  investmentPreference: string;
  relationshipManager: string;
  advisorAssigned: string;
  leadSource: string;
  tags: string;
  campaignSegmentation: string;
  status: ClientOperationalStatus;
  approvalStatus: ClientApprovalStatus;
  subscriptionTier: string;
  onboardingStatus: string;
  onboardingStage: string;
  kycStatus: string;
  investmentObjective: string;
  financialPlanningStatus: string;
  notes: string;
  notificationEmail: boolean;
  notificationWhatsapp: boolean;
  notificationSms: boolean;
  notificationPush: boolean;
}

type EditStep = "identity" | "lifecycle" | "portfolio" | "communication" | "advisory" | "notes";

const EDIT_STEPS: Array<{ id: EditStep; label: string }> = [
  { id: "identity", label: "Identity" },
  { id: "lifecycle", label: "Lifecycle" },
  { id: "portfolio", label: "Portfolio Preferences" },
  { id: "communication", label: "Communication" },
  { id: "advisory", label: "Advisory" },
  { id: "notes", label: "Notes" },
];

function createInitialState(client?: ClientProfile | null): ClientFormState {
  return {
    name: client?.name ?? "",
    email: client?.email ?? "",
    phone: client?.phone ?? "",
    whatsapp: client?.whatsapp ?? "",
    address: client?.address ?? "",
    dob: client?.dob ?? "",
    netWorth: client?.netWorth != null ? String(client.netWorth) : "",
    riskProfile: client?.riskProfile ?? "",
    incomeBracket: client?.incomeBracket ?? "",
    investmentPreference: client?.investmentPreference ?? "",
    relationshipManager: client?.relationshipManager ?? "",
    advisorAssigned: client?.advisorAssigned ?? "",
    leadSource: client?.leadSource ?? "",
    tags: client?.tags?.join(", ") ?? "",
    campaignSegmentation: client?.campaignSegmentation ?? "",
    status: client?.canonicalStatus ?? client?.status ?? "lead",
    approvalStatus: client?.approvalStatus ?? "pending",
    subscriptionTier: client?.subscriptionTier ?? "standard",
    onboardingStatus: client?.onboardingStatus ?? "pipeline",
    onboardingStage: client?.onboardingStage ?? "",
    kycStatus: client?.kycStatus ?? "pending",
    investmentObjective: client?.investmentObjective ?? "",
    financialPlanningStatus: client?.financialPlanningStatus ?? "",
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
  const [step, setStep] = useState<EditStep>("identity");

  useEffect(() => {
    setForm(createInitialState(client));
    setStep("identity");
  }, [client]);

  const title = useMemo(() => (mode === "create" ? "Create client workspace" : "Edit client workspace"), [mode]);

  function setField<K extends keyof ClientFormState>(key: K, value: ClientFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const stepIndex = EDIT_STEPS.findIndex((item) => item.id === step);
  const hasPreviousStep = stepIndex > 0;
  const hasNextStep = stepIndex < EDIT_STEPS.length - 1;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      whatsapp: form.whatsapp.trim() || undefined,
      address: form.address.trim() || undefined,
      dob: form.dob || undefined,
      netWorth: form.netWorth ? Number(form.netWorth) : undefined,
      riskProfile: form.riskProfile || undefined,
      incomeBracket: form.incomeBracket || undefined,
      investmentPreference: form.investmentPreference || undefined,
      relationshipManager: form.relationshipManager || undefined,
      advisorAssigned: form.advisorAssigned || undefined,
      leadSource: form.leadSource || undefined,
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      campaignSegmentation: form.campaignSegmentation || undefined,
      approvalStatus: form.approvalStatus,
      subscriptionTier: form.subscriptionTier || undefined,
      onboardingStatus: form.onboardingStatus || undefined,
      onboardingStage: form.onboardingStage || undefined,
      kycStatus: form.kycStatus || undefined,
      investmentObjective: form.investmentObjective || undefined,
      financialPlanningStatus: form.financialPlanningStatus || undefined,
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
        <div className="overflow-x-auto">
          <div className="inline-flex min-w-full gap-2 rounded-xl border border-white/8 bg-white/[0.03] p-1 sm:min-w-0">
            {EDIT_STEPS.map((item) => {
              const active = item.id === step;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setStep(item.id)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                    active ? "bg-sky-500/20 text-sky-100" : "text-slate-300 hover:bg-white/[0.05]"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {step === "identity" ? (
          <Section title="Identity" description="Core identity and profile data.">
            <Field label="Name"><input required className={INPUT_CLASS} value={form.name} onChange={(event) => setField("name", event.target.value)} /></Field>
            <Field label="Email"><input required type="email" className={INPUT_CLASS} value={form.email} onChange={(event) => setField("email", event.target.value)} /></Field>
            <Field label="Date of birth"><input type="date" className={INPUT_CLASS} value={form.dob} onChange={(event) => setField("dob", event.target.value)} /></Field>
            <Field label="Address" fullWidth><textarea rows={3} className={INPUT_CLASS} value={form.address} onChange={(event) => setField("address", event.target.value)} /></Field>
          </Section>
        ) : null}

        {step === "lifecycle" ? (
          <Section title="Lifecycle" description="Workflow stage, approval, and service state.">
            <Field label="Client status">
              <select className={INPUT_CLASS} value={form.status} onChange={(event) => setField("status", event.target.value as ClientOperationalStatus)}>
                <option value="lead">Lead</option>
                <option value="onboarding">Onboarding</option>
                <option value="pending_kyc">Pending KYC</option>
                <option value="approved">Approved</option>
                <option value="active">Active</option>
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
            <Field label="Onboarding status"><input className={INPUT_CLASS} value={form.onboardingStatus} onChange={(event) => setField("onboardingStatus", event.target.value)} placeholder="pipeline / kyc / live" /></Field>
            <Field label="Onboarding stage"><input className={INPUT_CLASS} value={form.onboardingStage} onChange={(event) => setField("onboardingStage", event.target.value)} placeholder="documents / verification / ready" /></Field>
            <Field label="KYC status">
              <select className={INPUT_CLASS} value={form.kycStatus} onChange={(event) => setField("kycStatus", event.target.value)}>
                <option value="">Select status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </Field>
            <Field label="Subscription tier"><input className={INPUT_CLASS} value={form.subscriptionTier} onChange={(event) => setField("subscriptionTier", event.target.value)} placeholder="standard / premium / private" /></Field>
          </Section>
        ) : null}

        {step === "portfolio" ? (
          <Section title="Portfolio preferences" description="Risk and investment suitability fields.">
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
            <Field label="Investment objective"><input className={INPUT_CLASS} value={form.investmentObjective} onChange={(event) => setField("investmentObjective", event.target.value)} placeholder="growth / income / preservation" /></Field>
            <Field label="Financial planning status"><input className={INPUT_CLASS} value={form.financialPlanningStatus} onChange={(event) => setField("financialPlanningStatus", event.target.value)} placeholder="not started / in progress / completed" /></Field>
          </Section>
        ) : null}

        {step === "communication" ? (
          <Section title="Communication" description="Channels and notification routing.">
            <Field label="Phone"><input className={INPUT_CLASS} value={form.phone} onChange={(event) => setField("phone", event.target.value)} /></Field>
            <Field label="WhatsApp"><input className={INPUT_CLASS} value={form.whatsapp} onChange={(event) => setField("whatsapp", event.target.value)} /></Field>
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
        ) : null}

        {step === "advisory" ? (
          <Section title="Advisory" description="Coverage ownership and segmentation intelligence.">
            <Field label="Relationship manager"><input className={INPUT_CLASS} value={form.relationshipManager} onChange={(event) => setField("relationshipManager", event.target.value)} /></Field>
            <Field label="Advisor assigned"><input className={INPUT_CLASS} value={form.advisorAssigned} onChange={(event) => setField("advisorAssigned", event.target.value)} /></Field>
            <Field label="Lead source"><input className={INPUT_CLASS} value={form.leadSource} onChange={(event) => setField("leadSource", event.target.value)} /></Field>
            <Field label="Campaign segmentation"><input className={INPUT_CLASS} value={form.campaignSegmentation} onChange={(event) => setField("campaignSegmentation", event.target.value)} placeholder="income desk / property onboarding / hedge campaign" /></Field>
            <Field label="Tags" fullWidth><input className={INPUT_CLASS} value={form.tags} onChange={(event) => setField("tags", event.target.value)} placeholder="family office, priority, nri" /></Field>
          </Section>
        ) : null}

        {step === "notes" ? (
          <Section title="Notes" description="Advisor notes and relationship context.">
            <Field label="Relationship notes" fullWidth><textarea rows={5} className={INPUT_CLASS} value={form.notes} onChange={(event) => setField("notes", event.target.value)} placeholder="Latest meeting notes, escalation context, service notes…" /></Field>
          </Section>
        ) : null}

        {error ? <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!hasPreviousStep}
              onClick={() => {
                if (!hasPreviousStep) return;
                setStep(EDIT_STEPS[stepIndex - 1].id);
              }}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={!hasNextStep}
              onClick={() => {
                if (!hasNextStep) return;
                setStep(EDIT_STEPS[stepIndex + 1].id);
              }}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-40"
            >
              Next
            </button>
          </div>

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
        </div>
      </form>
    </div>
  );
}
