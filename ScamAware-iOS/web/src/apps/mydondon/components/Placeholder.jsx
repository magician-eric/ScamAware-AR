import { ImageIcon } from 'lucide-react';
import { useT } from '../i18n';

// No real product photography exists yet - every product image in this
// scenario is this labeled placeholder (same convention as scenario04's
// components/blackpi/Placeholder), swapped for a real <img> once photography
// is supplied. `label` is already localized by the caller (it comes from
// product.assetLabel, resolved per-language in data/scenario05Products.js).
export function Placeholder({ label, className = '', iconSize = 22 }) {
  const t = useT();
  return (
    <div className={`go-ph ${className}`} role="img" aria-label={t('圖片佔位：{label}', { label })}>
      <ImageIcon size={iconSize} aria-hidden="true" />
      <span className="go-ph-label">{label}</span>
    </div>
  );
}
