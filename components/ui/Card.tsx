import { ReactNode } from "react";

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export default function Card({ title, children, className = "" }: CardProps) {
  return (
    <div
      className={`glass-card rounded-2xl p-6 ${className}`}
    >
      {title && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gold-light">
          {title}
        </p>
      )}
      {children}
    </div>
  );
}
