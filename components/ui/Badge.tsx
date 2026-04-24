interface BadgeProps {
  label: string;
  variant?: "green" | "yellow" | "red" | "gray" | "blue";
}

const variantClasses: Record<NonNullable<BadgeProps["variant"]>, string> = {
  green: "bg-green-900/60 text-green-400",
  yellow: "bg-yellow-900/60 text-yellow-400",
  red: "bg-red-900/60 text-red-400",
  gray: "bg-slate-800 text-slate-400",
  blue: "bg-blue-900/60 text-blue-400",
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
