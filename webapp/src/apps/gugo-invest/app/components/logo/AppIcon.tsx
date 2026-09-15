import { LogoMark } from "./LogoMark";

interface AppIconProps {
  size?: number;
  variant?: "dark" | "light";
  className?: string;
}

/** Rounded-square app-icon tile (favicon / PWA icon / home-screen icon). */
export function AppIcon({ size = 96, variant = "dark", className = "" }: AppIconProps) {
  const bg = variant === "dark" ? "#0D1221" : "#FFFFFF";
  const border = variant === "dark" ? "border-brand-gold/30" : "border-brand-navy/10";
  return (
    <div
      className={`inline-flex items-center justify-center rounded-[22%] border ${border} ${className}`}
      style={{ width: size, height: size, background: bg }}
    >
      <LogoMark size={size * 0.62} />
    </div>
  );
}
