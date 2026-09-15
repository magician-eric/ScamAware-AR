import { HPE_BRAND, hpeBrandLabel, hpeBrandName } from '../brand';
import { getLang } from '../i18n';

// The only place this App draws its mark. Renders the supplied artwork and
// nothing else - no CSS-drawn badge, no inline SVG recreation. If the file is
// ever missing/renamed, falls back to plain text rather than fabricating a
// substitute logo (same pattern as apps/mydondon/components/MyDonDonLogo.jsx).
//
// `variant` maps to HPE_BRAND.logos: 'horizontal' (header lockup - HPE badge
// + 黑皮通 + HAPPY EXPRESS in one image) or 'deliveryIcon' (the truck mark,
// for anywhere a compact/square glyph reads better than the wide lockup).
export function HpeLogo({ variant = 'horizontal', height = 28, className = '' }) {
  const lang = getLang();
  const src = HPE_BRAND.logos[variant];
  if (!src) {
    return (
      <span className={`hpe-logo-text ${className}`.trim()} style={{ fontSize: Math.round(height * 0.6) }}>
        {hpeBrandName(lang)}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={hpeBrandLabel(lang)}
      className={`hpe-logo ${className}`.trim()}
      style={{ height }}
      draggable="false"
    />
  );
}
