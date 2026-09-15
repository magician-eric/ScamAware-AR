import { MYDONDON, MYDONDON_LOGOS, mydondonBrandLabel } from '../brand/manifest';
import { getLang } from '../i18n';

// The only place the MyDonDon mark is rendered. It draws the supplied artwork
// and nothing else - no CSS-drawn mark, no inline SVG, no emoji stand-in (spec
// sections 3 / 43 / 57). If a file is missing from ../assets/ the manifest's
// glob returns undefined for that key and this falls back to the plain brand
// name as text, which is an accessible label rather than an imitation of the
// logo.
//
// `variant` maps to the supplied file set: 'horizontal' (app header) and
// 'appIcon' (compact square lockup) are the two in use. 'stacked' /
// 'wordmark' / 'wordmarkCn' / 'white' are supplied brand variants held in
// reserve - available to any screen that needs them, deliberately not forced
// into the UI, and not dead files to be cleaned up
// (docs/asset-architecture.md 5, 8).
export function MyDonDonLogo({ variant = 'horizontal', height = 22, className = '' }) {
  const src = MYDONDON_LOGOS[variant];
  if (!src) {
    return (
      <span className={`md-logo-text ${className}`.trim()} style={{ fontSize: Math.round(height * 0.82) }}>
        {MYDONDON.name}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={mydondonBrandLabel(getLang())}
      className={`md-logo ${className}`.trim()}
      style={{ height }}
      draggable="false"
    />
  );
}
