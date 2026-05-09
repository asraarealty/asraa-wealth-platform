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
    return () => {
      timeoutIdsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      timeoutIdsRef.current.clear();
    };
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex w-[min(92vw,24rem)] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur-md"
            style={{
              background:
                toast.type === "success"
                  ? "rgba(16,185,129,0.12)"
                  : toast.type === "error"
                    ? "rgba(239,68,68,0.12)"
                    : "rgba(0,229,255,0.12)",
              borderColor:
                toast.type === "success"
                  ? "rgba(16,185,129,0.35)"
                  : toast.type === "error"
                    ? "rgba(239,68,68,0.35)"
                    : "rgba(0,229,255,0.35)",
              color:
                toast.type === "success"
                  ? "#86efac"
                  : toast.type === "error"
                    ? "#fda4af"
                    : "#7dd3fc",
            }}
            role="status"
            aria-live="polite"
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used within ToastProvider");
  return value;
}
