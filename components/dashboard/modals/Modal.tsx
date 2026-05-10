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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`${width} modal-panel rounded-2xl shadow-2xl flex flex-col max-h-[90vh]`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0 modal-border-b">
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
        <div className="px-6 py-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

/* ── Shared form helpers ─────────────────────────────────────────────── */

export function FormField({
  label,
  children,
  required,
  error,
}: {
  label: string;
  children: ReactNode;
  required?: boolean;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-300">{error}</p>}
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
  name,
  id,
}: {
  placeholder?: string;
  type?: string;
  value: string | number;
  onChange: (v: string) => void;
  min?: string;
  step?: string;
  name?: string;
  id?: string;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      min={min}
      step={step}
      name={name}
      id={id}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2.5 text-sm rounded-xl gold-input"
    />
  );
}

export function FormError({ children }: { children: ReactNode }) {
  return (
    <p className="form-error text-sm rounded-lg px-3 py-2">{children}</p>
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
    <div className="flex items-center justify-end gap-3 px-6 py-4 shrink-0 modal-border-t">
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-2 text-sm rounded-xl transition-colors text-gray-300 hover:text-white"
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
        className="px-5 py-2 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
        style={{
          background: saving ? "rgba(201,162,39,0.5)" : "#c9a227",
          color: "#071a14",
        }}
      >
        {saving ? "Saving…" : saveLabel}
      </button>
    </div>
  );
}
