import { getAsset } from '../data/assetMap';
import { Placeholder } from './Placeholder';
import { useT } from '../i18n';

// Single entry point for every scenario04 product / evidence / unboxing
// picture. Resolves the assetKey through data/assetMap.js and renders the
// real photo when one exists, falling back to the dashed <Placeholder>
// tile only for assets that genuinely have no artwork yet (the decorative
// filler storefront items). Call sites never need to know which case they
// are in - they just pass an assetKey and a layout className.
//
// Every real asset is square, so `cover` never distorts the product or
// crops it out of frame; `fit="contain"` is available for the few spots
// that would rather letterbox than crop.
export function AssetImage({
  assetKey,
  label,
  className = '',
  size,
  dashed = true,
  iconSize = 22,
  fit = 'cover',
  // Above-the-fold hero images opt out of lazy loading so the first paint
  // of a product page is never a blank box.
  priority = false,
}) {
  const t = useT();
  const asset = getAsset(assetKey);
  const caption = label || asset.label;

  if (!asset.src) {
    return (
      <Placeholder
        label={caption}
        size={size ?? asset.size}
        className={className}
        dashed={dashed}
        iconSize={iconSize}
      />
    );
  }

  return (
    <img
      src={asset.src}
      alt={t(caption)}
      className={`bp-media bp-img${fit === 'contain' ? ' bp-img-contain' : ''} ${className}`.trim()}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
      draggable="false"
    />
  );
}
