"use client";

import { useState, useRef, type KeyboardEvent } from "react";

/** Delay in ms before hiding suggestions on blur — prevents dropdown closing before click fires */
const BLUR_HIDE_DELAY_MS = 150;

const PRESET_TAGS = [
  "Long Term",
  "Short Term",
  "High Risk",
  "Low Risk",
  "Income",
  "Growth",
  "Retirement",
  "Emergency Fund",
  "Dividend",
  "Index Fund",
];

interface TagSelectProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export default function TagSelect({
  value,
  onChange,
  placeholder = "Add tags…",
}: TagSelectProps) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = PRESET_TAGS.filter(
    (t) =>
      t.toLowerCase().includes(input.toLowerCase()) && !value.includes(t)
  );

  function addTag(tag: string) {
    const trimmed = tag.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput("");
    setShowSuggestions(false);
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault();
      addTag(input);
    } else if (e.key === "Backspace" && !input && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  }

  const showDropdown =
    showSuggestions && (input.length > 0 || suggestions.length > 0);

  return (
    <div className="relative">
      <div
        className="flex flex-wrap gap-1.5 min-h-[40px] p-2 rounded-xl cursor-text"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(56,189,248,0.2)",
        }}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              background: "rgba(56,189,248,0.15)",
              border: "1px solid rgba(56,189,248,0.3)",
              color: "#7dd3fc",
            }}
          >
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
              className="hover:text-white transition-colors leading-none"
              aria-label={`Remove tag ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowSuggestions(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), BLUR_HIDE_DELAY_MS)}
          placeholder={value.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[80px] bg-transparent text-sm text-white placeholder-white/30 focus:outline-none"
        />
      </div>

      {showDropdown && (
        <ul
          className="absolute z-50 mt-1 w-full rounded-xl overflow-hidden shadow-xl"
          style={{
            background: "rgba(8,48,36,0.97)",
            border: "1px solid rgba(56,189,248,0.2)",
            backdropFilter: "blur(20px)",
          }}
        >
          {suggestions.slice(0, 6).map((s) => (
            <li
              key={s}
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(s);
              }}
              className="px-3 py-2 text-sm text-white cursor-pointer transition-colors"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.background =
                  "rgba(56,189,248,0.1)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.background = "")
              }
            >
              {s}
            </li>
          ))}
          {input.trim() && !PRESET_TAGS.includes(input.trim()) && (
            <li
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(input);
              }}
              className="px-3 py-2 text-sm cursor-pointer transition-colors"
              style={{ color: "#7dd3fc" }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.background =
                  "rgba(56,189,248,0.1)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.background = "")
              }
            >
              Create &ldquo;{input.trim()}&rdquo;
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
