"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastType = "success" | "error" | "info";
export const GLOBAL_TOAST_EVENT = "asraa:toast";

type ToastMessage = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);
const TOAST_DURATION_MS = 3500;

const TOAST_STYLES: Record<
  ToastType,
  { bg: string; border: string; color: string }
> = {
  success: {
    bg: "rgba(16,185,129,0.12)",
    border: "rgba(16,185,129,0.35)",
    color: "#86efac",
  },
  error: {
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.35)",
    color: "#fda4af",
  },
  info: {
    bg: "rgba(0,229,255,0.12)",
    border: "rgba(0,229,255,0.35)",
    color: "#7dd3fc",
  },
};

function ToastIcon({ type }: { type: ToastType }) {
  if (type === "success") {
    return (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    );
  }
  if (type === "error") {
    return (
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
    </svg>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const idRef = useRef(0);
  const timeoutIdsRef = useRef<Set<number>>(new Set());

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev, { id, message, type }]);
      const timeoutId = window.setTimeout(() => {
        dismissToast(id);
        timeoutIdsRef.current.delete(timeoutId);
      }, TOAST_DURATION_MS);
      timeoutIdsRef.current.add(timeoutId);
    },
    [dismissToast]
  );

  useEffect(() => {
    const onGlobalToast = (event: Event) => {
      const customEvent = event as CustomEvent<{ message?: string; type?: ToastType }>;
      const message = customEvent.detail?.message?.trim();
      if (!message) return;
      const type: ToastType = customEvent.detail?.type ?? "info";
      showToast(message, type);
    };
    window.addEventListener(GLOBAL_TOAST_EVENT, onGlobalToast as EventListener);
    return () => {
      window.removeEventListener(GLOBAL_TOAST_EVENT, onGlobalToast as EventListener);
      timeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutIdsRef.current.clear();
    };
  }, [showToast]);

  const value = useMemo<ToastContextValue>(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex w-[min(92vw,24rem)] flex-col gap-2">
        {toasts.map((toast) => {
          const s = TOAST_STYLES[toast.type];
          return (
            <div
              key={toast.id}
              className="animate-toast-in rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-md flex items-start gap-2.5"
              style={{
                background: s.bg,
                borderColor: s.border,
                color: s.color,
              }}
              role="status"
              aria-live="polite"
            >
              <ToastIcon type={toast.type} />
              <span className="flex-1 leading-snug">{toast.message}</span>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
                aria-label="Dismiss"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used within ToastProvider");
  return value;
}
