import { AssetImage } from './AssetImage';
import { useT } from '../i18n';

// Compact single-line product row for decorative/filler items (spec:
// 68-82px row height, 56-60px thumbnail) - used on the home feed so
// non-story products don't compete for space with the two story products.
//
// S04 remaining audit: this was a button element, but its one caller (Home's
// decor feed) never passed an onClick - so each row was a real, pressable,
// keyboard-reachable control that did nothing at all. Same defect AUD-07
// named for 分享 on the PDP. These rows exist to make the storefront look
// stocked; the story's products are the two hero cards above them, which is
// what Home's `dual` contract declares. So the row is a plain div now: the
// filler item still shows its photo, name and price, and there is nothing
// left to press. The onClick prop is gone rather than left unused - a row
// that took a handler would invite one back.
export function CompactProductRow({ product }) {
  const t = useT();
  return (
    <div className="bp-compact-row is-decorative">
      <AssetImage assetKey={product.assetKey} label={product.assetLabel} size="" dashed={false} className="bp-compact-thumb" />
      <span className="bp-compact-name">{t(product.name)}</span>
      <span className="bp-compact-price">NT${product.price.toLocaleString()}</span>
    </div>
  );
}
