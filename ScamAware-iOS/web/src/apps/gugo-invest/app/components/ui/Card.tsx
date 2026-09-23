import type { ReactNode, HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ children, className = "", ...rest }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-brand-gold/15 bg-brand-navy/40 p-4 shadow-[0_4px_18px_rgba(0,0,0,0.25)] ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
