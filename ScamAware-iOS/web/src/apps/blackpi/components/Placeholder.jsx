import { ImageIcon } from 'lucide-react';
import { useT } from '../i18n';

// Fallback tile for scenario04 assets that have no real photography (the
// decorative filler storefront items). Real photos go through
// components/blackpi/AssetImage.jsx, which renders this only when
// data/assetMap.js has no `src` for the key - so a dashed box on screen
// now genuinely means "no artwork exists for this", not "not wired up yet".
// `label` comes from data/assetMap.js's Chinese captions (or a page's own
// inline Chinese label) - translated centrally here so every call site
// stays a plain string prop.
export function Placeholder({ label, size = '800×800', className = '', dashed = true, iconSize = 22 }) {
  const t = useT();
  const translatedLabel = t(label);
  return (
    <div
      className={`bp-media bp-ph ${dashed ? 'bp-ph-dashed' : ''} ${className}`}
      role="img"
      aria-label={`${t('圖片佔位：')}${translatedLabel}`}
    >
      <ImageIcon size={iconSize} aria-hidden="true" />
      <span className="bp-ph-label">{translatedLabel}</span>
    </div>
  );
}
