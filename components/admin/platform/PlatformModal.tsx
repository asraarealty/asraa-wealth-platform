"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

function useEscape(onClose: () => void) {
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);
}

export function PlatformModal({
  title,
  description,
  children,
  onClose,
  footer,
  size = "md",
}: {
  title: string;
  description?: string;
  children?: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useEscape(onClose);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  const sizeClass = size === "lg" ? "max-w-3xl" : size === "sm" ? "max-w-md" : "max-w-xl";

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        ref={containerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className={`w-full ${sizeClass} rounded-[1.5rem] border border-sky-400/15 bg-[linear-gradient(160deg,rgba(10,22,51,0.98),rgba(4,9,21,0.98))] shadow-[0_24px_80px_rgba(0,0,0,0.55)] outline-none`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/8 px-6 py-5">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-sky-300/70">Operational modal</p>
            <h2 className="mt-1 text-lg font-semibold text-white">{title}</h2>
            {description ? <p className="mt-1 text-sm text-slate-400">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer ? <div className="flex items-center justify-end gap-3 border-t border-white/8 px-6 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}

export function PlatformConfirmModal({
  title,
  description,
  confirmLabel,
  onClose,
  onConfirm,
  pending,
  tone = "danger",
}: {
  title: string;
  description: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: () => void;
  pending?: boolean;
  tone?: "danger" | "primary";
}) {
  return (
    <PlatformModal
      title={title}
      description={description}
      onClose={onClose}
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
              tone === "danger"
                ? "bg-rose-500 text-white hover:bg-rose-400"
                : "bg-sky-400 text-[#04102a] hover:bg-sky-300"
            }`}
          >
            {pending ? "Processing…" : confirmLabel}
          </button>
        </>
      }
    >
      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm leading-6 text-slate-300">
        {description}
      </div>
    </PlatformModal>
  );
}
