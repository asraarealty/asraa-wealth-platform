"use client";

interface ToggleProps {
  checked: boolean;
  onChange: (val: boolean) => void;
  label?: string;
  id?: string;
  disabled?: boolean;
}

export default function Toggle({ checked, onChange, label, id, disabled = false }: ToggleProps) {
  return (
    <div
      className="flex items-center gap-3"
      style={{ cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}
    >
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className="relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors duration-200 focus:outline-none"
        style={{
          background: checked
            ? "linear-gradient(135deg, #00E5FF, #4F8CFF)"
            : "rgba(255,255,255,0.12)",
          boxShadow: checked ? "0 0 10px rgba(0,229,255,0.3)" : "none",
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        <span
          className="inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200"
          style={{
            transform: checked ? "translate(24px, 4px)" : "translate(4px, 4px)",
          }}
        />
      </button>
      {label && (
        <span className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
          {label}
        </span>
      )}
    </div>
  );
}
