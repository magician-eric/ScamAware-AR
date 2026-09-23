import { TriangleAlert } from 'lucide-react';

// Scrolling attention-strip placed at the top of scenario02's warning
// screens (RedWarning, SafetyAlert, Hotline165) - text keeps scrolling
// until read rather than sitting as a static paragraph a player can
// skim past. The text renders twice back-to-back and the pair is
// animated exactly -50% of its own width, which is what makes the loop
// seamless (no visible jump/reset the way a single copy + "restart"
// would have).
export function WarningMarquee({ text }) {
  return (
    <div className="meetu-warning-marquee">
      <TriangleAlert size={16} className="meetu-warning-marquee-icon" />
      <div className="meetu-warning-marquee-track">
        <div className="meetu-warning-marquee-inner">
          <span className="meetu-warning-marquee-text">{text}</span>
          <span className="meetu-warning-marquee-text" aria-hidden="true">{text}</span>
        </div>
      </div>
    </div>
  );
}
