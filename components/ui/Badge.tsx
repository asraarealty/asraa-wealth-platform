interface BadgeProps {
  label: string;
  variant?: "green" | "yellow" | "red" | "gray" | "blue" | "cyan";
}

const variantClasses: Record<NonNullable<BadgeProps["variant"]>, string> = {
  green:  "bg-[rgba(0,255,159,0.1)] text-[#00ff9f] border border-[rgba(0,255,159,0.2)]",
  yellow: "bg-[rgba(201,162,39,0.12)] text-[#d4af4a] border border-[rgba(201,162,39,0.25)]",
  red:    "bg-[rgba(255,77,109,0.1)] text-[#ff4d6d] border border-[rgba(255,77,109,0.2)]",
  gray:   "bg-white/5 text-white/50 border border-white/10",
  blue:   "bg-[rgba(79,140,255,0.1)] text-[#4F8CFF] border border-[rgba(79,140,255,0.2)]",
  cyan:   "bg-[rgba(0,229,255,0.1)] text-[#00E5FF] border border-[rgba(0,229,255,0.2)]",
};

export default function Badge({ label, variant = "gray" }: BadgeProps) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${variantClasses[variant]}`}
    >
      {label}
    </span>
  );
}

