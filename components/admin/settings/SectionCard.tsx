"use client";

import { ReactNode, useState } from "react";
import Button from "@/components/ui/Button";

interface SectionCardProps {
  title: string;
  icon?: ReactNode;
  onSave: () => Promise<void>;
  children: ReactNode;
  defaultOpen?: boolean;
  loading?: boolean;
}

export default function SectionCard({
  title,
  icon,
  onSave,
  children,
  defaultOpen = true,
  loading = false,
}: SectionCardProps) {
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [open, setOpen] = useState(defaultOpen);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave();
      setToast({ message: "Settings saved successfully", type: "success" });
    } catch {
      setToast({ message: "Failed to save settings", type: "error" });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 3000);
    }
  }

  return (
    <div
      className="glass-card rounded-2xl relative overflow-hidden"
      style={{ border: "1px solid rgba(255,255,255,0.08)" }}
    >
      {/* Header — accordion trigger on mobile only */}
      <div className="w-full flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          {icon && (
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: "rgba(0,229,255,0.08)",
                border: "1px solid rgba(0,229,255,0.15)",
              }}
            >
              <span style={{ color: "#00E5FF" }}>{icon}</span>
            </div>
          )}
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "#00E5FF" }}
          >
            {title}
          </p>
        </div>
        {/* Chevron toggle — mobile only */}
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? "Collapse section" : "Expand section"}
          onClick={() => setOpen((v) => !v)}
          className="md:hidden flex items-center justify-center w-7 h-7 rounded-lg transition-colors"
          style={{ background: "rgba(255,255,255,0.04)" }}
        >
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            style={{ color: "rgba(255,255,255,0.3)" }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Body — always open on desktop, collapsible on mobile */}
      <div className={`${open ? "block" : "hidden"} md:block`}>
        <div
          className="px-6 pb-2"
          style={{
            borderTop: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          {loading ? (
            <div className="pt-5 flex justify-center py-10">
              <svg
                className="animate-spin h-6 w-6"
                style={{ color: "rgba(0,229,255,0.5)" }}
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : (
            <div className="pt-5 space-y-4">{children}</div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-6 py-4 mt-2"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          {toast ? (
            <span
              className="text-xs font-medium flex items-center gap-1.5 animate-fade-in"
              style={{ color: toast.type === "success" ? "#00ff9f" : "#ff4d6d" }}
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {toast.type === "success" ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                )}
              </svg>
              {toast.message}
            </span>
          ) : (
            <span />
          )}
          <Button size="sm" loading={saving} onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
