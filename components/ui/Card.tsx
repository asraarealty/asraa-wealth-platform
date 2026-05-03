import { ReactNode } from "react";

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  glow?: boolean;
}

export default function Card({ title, children, className = "", glow = false }: CardProps) {
  return (
    <div
      className={`glass-card rounded-2xl p-6 ${glow ? "card-hover" : ""} ${className}`}
    >
      {title && (
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[rgba(0,229,255,0.6)]">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

