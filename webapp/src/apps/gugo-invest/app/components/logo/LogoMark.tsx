interface LogoMarkProps {
  size?: number;
  className?: string;
}

/**
 * The GuGo Invest icon: a gold "G" ring built from an upward-trending
 * candlestick/bar chart, cut through by a rising arrow — rebuilt as an SVG
 * component (not a cropped CIS screenshot) so it renders crisply at any
 * size and can be reused as logo-mark, inside logo-horizontal, and as the
 * app-icon tile.
 */
export function LogoMark({ size = 40, className = "" }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="GuGo Invest"
    >
      <defs>
        <linearGradient id="gugo-gold" x1="4" y1="4" x2="60" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F4D77B" />
          <stop offset="0.55" stopColor="#D4AF37" />
          <stop offset="1" stopColor="#A9812A" />
        </linearGradient>
      </defs>

      {/* G ring, open on the right so the bars/arrow read as tucked inside it */}
      <path
        d="M 44 15.5
           A 22 22 0 1 0 44 48.5
           L 44 34
           L 33 34"
        stroke="url(#gugo-gold)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Ascending bar chart, echoing the reference's candlestick motif */}
      <rect x="21" y="34" width="4.4" height="10" rx="1.2" fill="#EF4D4D" />
      <rect x="28.5" y="28" width="4.4" height="16" rx="1.2" fill="url(#gugo-gold)" />
      <rect x="36" y="21" width="4.4" height="23" rx="1.2" fill="#00B37E" />

      {/* Upward trend arrow cutting across the bars */}
      <path
        d="M 18 40 L 27 30 L 33 35 L 45 19"
        stroke="url(#gugo-gold)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M 38 18 L 46 18 L 46 26" stroke="url(#gugo-gold)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
