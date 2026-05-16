"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export interface ActionMenuItem {
  label: string;
  onSelect?: () => void;
  href?: string;
  disabled?: boolean;
  tone?: "default" | "danger";
}

export function ActionMenu({
  label = "Client actions",
  items,
}: {
  label?: string;
  items: ActionMenuItem[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:border-sky-300/30 hover:bg-sky-500/10 hover:text-white"
      >
        <span className="text-lg leading-none">⋮</span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 min-w-[12rem] overflow-hidden rounded-2xl border border-sky-400/15 bg-[#071229]/95 p-1.5 shadow-2xl backdrop-blur"
        >
          {items.map((item) => {
            const className = `flex w-full items-center rounded-xl px-3 py-2 text-left text-xs font-semibold transition ${
              item.disabled
                ? "cursor-not-allowed text-slate-500"
                : item.tone === "danger"
                ? "text-rose-200 hover:bg-rose-500/10"
                : "text-slate-200 hover:bg-white/8 hover:text-white"
            }`;

            if (item.href && !item.disabled) {
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  role="menuitem"
                  className={className}
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpen(false);
                  }}
                >
                  {item.label}
                </Link>
              );
            }

            return (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                className={className}
                onClick={(event) => {
                  event.stopPropagation();
                  if (item.disabled) return;
                  setOpen(false);
                  item.onSelect?.();
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
