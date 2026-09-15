import { MEETU_LOGOS, MEETU_LOGO_ASPECT } from '../brand/manifest';

// `size` is the rendered height in px (the logo is real artwork, so height is
// the direct knob). Header vs. Match Success usage share this one component,
// picking `variant` instead of assembling their own markup.
export function MeetULogo({ size = 22, variant = 'compact' }) {
  const aspect = MEETU_LOGO_ASPECT[variant] ?? MEETU_LOGO_ASPECT.compact;
  return (
    <img
      className={`meetu-logo meetu-logo-${variant}`}
      src={MEETU_LOGOS[variant] ?? MEETU_LOGOS.compact}
      alt="MeetU"
      style={{ height: size, width: size * aspect, maxWidth: '100%', objectFit: 'contain' }}
    />
  );
}
