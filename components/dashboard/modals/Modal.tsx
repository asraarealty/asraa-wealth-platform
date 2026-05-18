"use client";

import { type ReactNode, useEffect } from "react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  width?: string;
}

export default function Modal({
  title,
  onClose,
  children,
  width = "w-full max-w-md",
}: ModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`${width} rounded-2xl shadow-2xl flex flex-col max-h-[calc(100vh-1.5rem)] sm:max-h-[90vh] overflow-hidden`}
        style={{
          background: "#0A1A14",
          border: "1px solid rgba(56,189,248,0.2)",
          boxShadow:
            "0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(56,189,248,0.08)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 sm:px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid rgba(56,189,248,0.12)" }}
        >
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors text-gray-400 hover:text-white"
            style={{ background: "rgba(255,255,255,0.06)" }}
            aria-label="Close modal"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

/* ── Shared form helpers ─────────────────────────────────────────────── */

export function FormField({
  label,
  children,
  required,
}: {
  label: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

export function FieldInput({
  placeholder,
  type = "text",
  value,
  onChange,
  min,
  step,
}: {
  placeholder?: string;
  type?: string;
  value: string | number;
  onChange: (v: string) => void;
  min?: string;
  step?: string;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      min={min}
      step={step}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2.5 text-sm text-white placeholder-white/30 rounded-xl transition focus:outline-none"
      style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(56,189,248,0.2)",
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "rgba(56,189,248,0.5)";
        e.currentTarget.style.boxShadow = "0 0 0 2px rgba(56,189,248,0.12)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "rgba(56,189,248,0.2)";
        e.currentTarget.style.boxShadow = "none";
      }}
    />
  );
}

export function ModalFooter({
  onCancel,
  onSave,
  saveLabel = "Save",
  saving,
}: {
  onCancel: () => void;
  onSave: () => void;
  saveLabel?: string;
  saving?: boolean;
}) {
  return (
    <div
      className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-4 shrink-0"
      style={{ borderTop: "1px solid rgba(56,189,248,0.12)" }}
    >
      <button
        type="button"
        onClick={onCancel}
        className="w-full sm:w-auto px-4 py-2 text-sm rounded-xl transition-colors text-gray-300 hover:text-white"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="w-full sm:w-auto px-5 py-2 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
        style={{
          background: saving ? "rgba(56,189,248,0.5)" : "#38bdf8",
          color: "#04102a",
        }}
      >
        {saving ? "Saving…" : saveLabel}
      </button>
    </div>
  );
}
