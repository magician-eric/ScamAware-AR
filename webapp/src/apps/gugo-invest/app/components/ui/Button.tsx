import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "buy" | "sell" | "ghost" | "outline";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  fullWidth?: boolean;
}

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "bg-brand-gold text-brand-bg hover:brightness-110",
  // Taiwan market convention: red = up/bullish (buy), green = down (sell).
  buy: "bg-brand-red text-white hover:brightness-110",
  sell: "bg-brand-green text-white hover:brightness-110",
  ghost: "bg-brand-navy/60 text-brand-white hover:bg-brand-navy",
  outline: "border border-brand-gold/40 text-brand-gold hover:bg-brand-gold/10",
};

export function Button({ variant = "primary", fullWidth = false, className = "", disabled, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`rounded-xl px-4 py-3 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        fullWidth ? "w-full" : ""
      } ${VARIANT_CLASS[variant]} ${className}`}
      {...rest}
    />
  );
}
